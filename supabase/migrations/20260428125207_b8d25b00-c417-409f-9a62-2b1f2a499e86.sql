
-- 24h KPI strip
CREATE OR REPLACE FUNCTION public.get_audit_overview()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT json_build_object(
    'critical_events_24h', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE severity = 'critical' AND created_at > now() - interval '24 hours'
    ),
    'warning_events_24h', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE severity = 'warning' AND created_at > now() - interval '24 hours'
    ),
    'failed_integrations_24h', (
      SELECT count(*) FROM public.integration_health_logs
      WHERE status = 'failed' AND logged_at > now() - interval '24 hours'
    ),
    'active_impersonations', (
      SELECT count(*) FROM public.super_admin_impersonation_logs
      WHERE ended_at IS NULL
    ),
    'unresolved_alerts', (
      SELECT count(*) FROM public.platform_alerts WHERE is_resolved = false
    ),
    'impersonations_24h', (
      SELECT count(*) FROM public.super_admin_impersonation_logs
      WHERE started_at > now() - interval '24 hours'
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- Unified audit feed
CREATE OR REPLACE FUNCTION public.list_platform_audit_events(
  start_date timestamptz DEFAULT NULL,
  end_date timestamptz DEFAULT NULL,
  filter_severity text DEFAULT NULL,
  filter_event_type text DEFAULT NULL,
  filter_team_id uuid DEFAULT NULL,
  filter_actor uuid DEFAULT NULL,
  filter_source text DEFAULT NULL,
  search_text text DEFAULT NULL,
  row_limit int DEFAULT 500
)
RETURNS TABLE(
  event_id text,
  source text,
  event_type text,
  severity text,
  actor_id uuid,
  actor_label text,
  team_id uuid,
  organisation_name text,
  target_label text,
  occurred_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  WITH activity AS (
    SELECT
      ('act:' || a.id::text)              AS event_id,
      'platform_activity'::text           AS source,
      a.event_type,
      coalesce(a.severity, 'info')        AS severity,
      a.user_id                           AS actor_id,
      (SELECT email FROM public.profiles p WHERE p.user_id = a.user_id LIMIT 1) AS actor_label,
      a.team_id,
      coalesce(a.organisation_name, (SELECT name FROM public.teams t WHERE t.id = a.team_id)) AS organisation_name,
      coalesce(a.event_source, '')        AS target_label,
      a.created_at                        AS occurred_at,
      coalesce(a.metadata,'{}'::jsonb)
        || jsonb_build_object('event_source', a.event_source, 'athlete_id', a.athlete_id) AS metadata
    FROM public.platform_activity_logs a
  ),
  imp AS (
    SELECT
      ('imp:' || i.id::text)              AS event_id,
      'impersonation'::text               AS source,
      CASE WHEN i.ended_at IS NULL THEN 'impersonation_active'
           ELSE 'impersonation_closed' END AS event_type,
      'warning'::text                     AS severity,
      i.super_admin_id                    AS actor_id,
      (SELECT email FROM public.super_admin_users s WHERE s.auth_user_id = i.super_admin_id LIMIT 1) AS actor_label,
      i.team_id,
      (SELECT name FROM public.teams t WHERE t.id = i.team_id) AS organisation_name,
      coalesce(i.reason, 'no reason given') AS target_label,
      i.started_at                        AS occurred_at,
      jsonb_build_object(
        'reason', i.reason,
        'started_at', i.started_at,
        'ended_at', i.ended_at,
        'impersonated_user_id', i.impersonated_user_id,
        'active', (i.ended_at IS NULL)
      ) AS metadata
    FROM public.super_admin_impersonation_logs i
  ),
  intf AS (
    SELECT
      ('int:' || h.id::text)              AS event_id,
      'integration_failure'::text         AS source,
      ('integration_failed:' || h.integration_name) AS event_type,
      'warning'::text                     AS severity,
      NULL::uuid                          AS actor_id,
      h.integration_name                  AS actor_label,
      h.team_id,
      (SELECT name FROM public.teams t WHERE t.id = h.team_id) AS organisation_name,
      coalesce(h.failure_reason, 'failure') AS target_label,
      h.logged_at                         AS occurred_at,
      jsonb_build_object(
        'integration_name', h.integration_name,
        'status', h.status,
        'latency_ms', h.latency_ms,
        'failure_reason', h.failure_reason,
        'payload', h.payload
      ) AS metadata
    FROM public.integration_health_logs h
    WHERE h.status = 'failed'
  ),
  unioned AS (
    SELECT * FROM activity
    UNION ALL SELECT * FROM imp
    UNION ALL SELECT * FROM intf
  )
  SELECT *
  FROM unioned u
  WHERE (start_date IS NULL OR u.occurred_at >= start_date)
    AND (end_date   IS NULL OR u.occurred_at <= end_date)
    AND (filter_severity   IS NULL OR u.severity = filter_severity)
    AND (filter_event_type IS NULL OR u.event_type = filter_event_type)
    AND (filter_team_id    IS NULL OR u.team_id = filter_team_id)
    AND (filter_actor      IS NULL OR u.actor_id = filter_actor)
    AND (filter_source     IS NULL OR u.source = filter_source)
    AND (
      search_text IS NULL OR search_text = '' OR
      u.event_type ILIKE '%' || search_text || '%' OR
      coalesce(u.actor_label,'') ILIKE '%' || search_text || '%' OR
      coalesce(u.organisation_name,'') ILIKE '%' || search_text || '%' OR
      coalesce(u.target_label,'') ILIKE '%' || search_text || '%' OR
      u.event_id ILIKE '%' || search_text || '%'
    )
  ORDER BY u.occurred_at DESC NULLS LAST
  LIMIT greatest(row_limit, 1);
END;
$function$;

-- Detail for a single event id (prefixed: act:, imp:, int:)
CREATE OR REPLACE FUNCTION public.get_audit_event_detail(event_id_in text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_uuid   uuid;
  v_team   uuid;
  v_result json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  v_prefix := split_part(event_id_in, ':', 1);
  BEGIN
    v_uuid := split_part(event_id_in, ':', 2)::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_prefix = 'act' THEN
    SELECT json_build_object(
      'event_id', event_id_in,
      'source', 'platform_activity',
      'event_type', a.event_type,
      'severity', coalesce(a.severity, 'info'),
      'actor_id', a.user_id,
      'actor_label', (SELECT email FROM public.profiles p WHERE p.user_id = a.user_id LIMIT 1),
      'actor_full_name', (SELECT full_name FROM public.profiles p WHERE p.user_id = a.user_id LIMIT 1),
      'team_id', a.team_id,
      'organisation_name', coalesce(a.organisation_name, (SELECT name FROM public.teams t WHERE t.id = a.team_id)),
      'occurred_at', a.created_at,
      'event_source', a.event_source,
      'athlete_id', a.athlete_id,
      'metadata', coalesce(a.metadata, '{}'::jsonb)
    ), a.team_id INTO v_result, v_team
    FROM public.platform_activity_logs a WHERE a.id = v_uuid;
  ELSIF v_prefix = 'imp' THEN
    SELECT json_build_object(
      'event_id', event_id_in,
      'source', 'impersonation',
      'event_type', CASE WHEN i.ended_at IS NULL THEN 'impersonation_active' ELSE 'impersonation_closed' END,
      'severity', 'warning',
      'actor_id', i.super_admin_id,
      'actor_label', (SELECT email FROM public.super_admin_users s WHERE s.auth_user_id = i.super_admin_id LIMIT 1),
      'actor_full_name', (SELECT full_name FROM public.super_admin_users s WHERE s.auth_user_id = i.super_admin_id LIMIT 1),
      'team_id', i.team_id,
      'organisation_name', (SELECT name FROM public.teams t WHERE t.id = i.team_id),
      'occurred_at', i.started_at,
      'metadata', jsonb_build_object(
        'reason', i.reason,
        'started_at', i.started_at,
        'ended_at', i.ended_at,
        'impersonated_user_id', i.impersonated_user_id,
        'active', (i.ended_at IS NULL)
      )
    ), i.team_id INTO v_result, v_team
    FROM public.super_admin_impersonation_logs i WHERE i.id = v_uuid;
  ELSIF v_prefix = 'int' THEN
    SELECT json_build_object(
      'event_id', event_id_in,
      'source', 'integration_failure',
      'event_type', 'integration_failed:' || h.integration_name,
      'severity', 'warning',
      'actor_id', NULL,
      'actor_label', h.integration_name,
      'team_id', h.team_id,
      'organisation_name', (SELECT name FROM public.teams t WHERE t.id = h.team_id),
      'occurred_at', h.logged_at,
      'metadata', jsonb_build_object(
        'integration_name', h.integration_name,
        'status', h.status,
        'latency_ms', h.latency_ms,
        'failure_reason', h.failure_reason,
        'payload', h.payload
      )
    ), h.team_id INTO v_result, v_team
    FROM public.integration_health_logs h WHERE h.id = v_uuid;
  ELSE
    RETURN NULL;
  END IF;

  IF v_result IS NULL THEN RETURN NULL; END IF;

  RETURN (v_result::jsonb || jsonb_build_object(
    'related_alerts',
    (SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
      SELECT id, alert_type, severity, title, description, created_at
      FROM public.platform_alerts
      WHERE is_resolved = false
        AND (v_team IS NULL OR team_id = v_team)
      ORDER BY created_at DESC LIMIT 5
    ) x)
  ))::json;
END;
$function$;
