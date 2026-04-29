
CREATE OR REPLACE FUNCTION public.run_integration_health_check(
  p_integration_name text,
  p_team_uuid uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  IF p_integration_name IS NULL OR length(trim(p_integration_name)) = 0 THEN
    RAISE EXCEPTION 'integration_name required';
  END IF;

  INSERT INTO public.integration_health_logs (integration_name, status, team_id, latency_ms, payload)
  VALUES (p_integration_name, 'success', p_team_uuid, 0,
          jsonb_build_object('source', 'manual_health_check', 'triggered_by', v_user));

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
  VALUES ('integration_health_check_run', 'control_centre.integrations', 'info',
          p_team_uuid, v_user,
          jsonb_build_object('integration_name', p_integration_name, 'scope',
            CASE WHEN p_team_uuid IS NULL THEN 'global' ELSE 'team' END));

  RETURN jsonb_build_object('ok', true, 'integration', p_integration_name, 'team_id', p_team_uuid);
END; $$;

CREATE OR REPLACE FUNCTION public.acknowledge_integration_issue(
  p_integration_name text,
  p_team_uuid uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  IF p_integration_name IS NULL OR length(trim(p_integration_name)) = 0 THEN
    RAISE EXCEPTION 'integration_name required';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason required (min 3 chars)';
  END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
  VALUES ('integration_issue_acknowledged', 'control_centre.integrations', 'info',
          p_team_uuid, v_user,
          jsonb_build_object('integration_name', p_integration_name, 'reason', p_reason));

  -- Auto-resolve any matching unresolved alerts referencing this integration / team
  UPDATE public.platform_alerts
  SET is_resolved = true, resolved_by = v_user
  WHERE is_resolved = false
    AND (team_id = p_team_uuid OR (p_team_uuid IS NULL AND team_id IS NULL))
    AND (alert_type ILIKE '%' || p_integration_name || '%' OR title ILIKE '%' || p_integration_name || '%');

  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.record_cc_athletics_retry(
  p_team_uuid uuid,
  p_reason text,
  p_status text,
  p_failure_reason text DEFAULT NULL,
  p_latency_ms integer DEFAULT NULL,
  p_record_count integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_user uuid := auth.uid(); v_severity text;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  IF p_status NOT IN ('success','failed') THEN RAISE EXCEPTION 'invalid status'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason required (min 3 chars)';
  END IF;

  INSERT INTO public.integration_health_logs (integration_name, status, team_id, latency_ms, failure_reason, payload)
  VALUES ('cc_athletics', p_status, p_team_uuid, p_latency_ms, p_failure_reason,
          jsonb_build_object('source', 'manual_retry', 'reason', p_reason,
                             'record_count', p_record_count, 'triggered_by', v_user));

  v_severity := CASE WHEN p_status = 'failed' THEN 'warning' ELSE 'info' END;
  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
  VALUES (CASE WHEN p_status = 'success' THEN 'cc_athletics_retry_success' ELSE 'cc_athletics_retry_failed' END,
          'control_centre.integrations', v_severity, p_team_uuid, v_user,
          jsonb_build_object('reason', p_reason, 'failure_reason', p_failure_reason,
                             'latency_ms', p_latency_ms, 'record_count', p_record_count));

  RETURN jsonb_build_object('ok', true, 'status', p_status);
END; $$;
