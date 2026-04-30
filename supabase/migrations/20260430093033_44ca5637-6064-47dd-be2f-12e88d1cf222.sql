-- =====================================================================
-- P2 UAT & Observability helpers
-- =====================================================================

-- Helper used by dispatcher edge function to record per-endpoint result.
CREATE OR REPLACE FUNCTION public.mark_webhook_endpoint_result(
  p_endpoint_id uuid,
  p_success boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_success THEN
    UPDATE public.platform_webhook_endpoints
       SET last_success_at = now(),
           failure_reason = NULL,
           updated_at = now()
     WHERE id = p_endpoint_id;
  ELSE
    UPDATE public.platform_webhook_endpoints
       SET last_failure_at = now(),
           failure_reason = LEFT(COALESCE(p_reason, 'unknown'), 500),
           updated_at = now()
     WHERE id = p_endpoint_id;
  END IF;
END;
$$;

-- Audit-only RPC: super admin records that a test was fired against an endpoint.
-- Actual HTTP call happens in the dispatch-notification-campaign edge function.
CREATE OR REPLACE FUNCTION public.log_webhook_test_fired(
  p_endpoint_id uuid,
  p_success boolean,
  p_status_code integer DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team uuid;
  v_label text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT team_id, label INTO v_team, v_label
  FROM public.platform_webhook_endpoints WHERE id = p_endpoint_id;
  IF v_label IS NULL THEN
    RAISE EXCEPTION 'endpoint_not_found';
  END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, user_id, team_id, metadata, severity)
  VALUES (
    'webhook_endpoint_test_fired',
    'control_centre',
    auth.uid(),
    v_team,
    jsonb_build_object(
      'endpoint_id', p_endpoint_id,
      'label', v_label,
      'success', p_success,
      'status_code', p_status_code,
      'reason', LEFT(COALESCE(p_reason, ''), 200)
    ),
    CASE WHEN p_success THEN 'info' ELSE 'warning' END
  );
END;
$$;

-- Super Admin observability snapshot
CREATE OR REPLACE FUNCTION public.get_super_admin_health_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_latest_snapshot timestamptz;
  v_latest_alert_run timestamptz;
  v_latest_cleanup_run timestamptz;
  v_recent_integration_failures int;
  v_active_webhooks int;
  v_total_webhooks int;
  v_active_impersonations int;
  v_unresolved_alerts int;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT MAX(snapshot_date)::timestamptz INTO v_latest_snapshot FROM public.organisation_health_metrics;
  SELECT MAX(created_at) INTO v_latest_alert_run FROM public.platform_alerts;
  SELECT MAX(started_at) INTO v_latest_cleanup_run FROM public.super_admin_impersonation_logs WHERE ended_at IS NOT NULL;

  SELECT COUNT(*) INTO v_recent_integration_failures
  FROM public.integration_health_logs
  WHERE logged_at > now() - interval '24 hours' AND status IN ('failed','error');

  SELECT COUNT(*) FILTER (WHERE is_active), COUNT(*) INTO v_active_webhooks, v_total_webhooks
  FROM public.platform_webhook_endpoints;

  SELECT COUNT(*) INTO v_active_impersonations
  FROM public.super_admin_impersonation_logs WHERE ended_at IS NULL;

  SELECT COUNT(*) INTO v_unresolved_alerts
  FROM public.platform_alerts WHERE COALESCE(is_resolved,false) = false;

  v_result := jsonb_build_object(
    'latest_org_health_snapshot_at', v_latest_snapshot,
    'latest_platform_alert_at', v_latest_alert_run,
    'latest_impersonation_cleanup_at', v_latest_cleanup_run,
    'recent_integration_failures_24h', v_recent_integration_failures,
    'active_webhook_endpoints', v_active_webhooks,
    'total_webhook_endpoints', v_total_webhooks,
    'active_impersonations', v_active_impersonations,
    'unresolved_alerts', v_unresolved_alerts,
    'generated_at', now()
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_webhook_endpoint_result(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_webhook_test_fired(uuid, boolean, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_super_admin_health_snapshot() TO authenticated;