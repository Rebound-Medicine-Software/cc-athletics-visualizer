
-- Integration overview RPC: per-integration health snapshot for last 24h
CREATE OR REPLACE FUNCTION public.get_integration_overview()
RETURNS TABLE(
  integration_name text,
  status text,
  success_count_24h bigint,
  failure_count_24h bigint,
  avg_latency_ms_24h numeric,
  last_success_at timestamp with time zone,
  last_failure_at timestamp with time zone,
  affected_team_count bigint,
  team_connected_count bigint
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
  WITH known(integration_name, flag_col) AS (
    VALUES
      ('cc_athletics', 'cc_athletics_connected'),
      ('cal_com', 'calcom_connected'),
      ('notificationapi', 'notificationapi_connected'),
      ('lovable_ai_gateway', NULL),
      ('supabase_edge_functions', NULL)
  ),
  observed AS (
    SELECT DISTINCT integration_name FROM public.integration_health_logs
  ),
  all_names AS (
    SELECT integration_name FROM known
    UNION
    SELECT integration_name FROM observed
  ),
  agg AS (
    SELECT
      l.integration_name,
      count(*) FILTER (WHERE l.status = 'success' AND l.logged_at > now() - interval '24 hours')::bigint AS success_count_24h,
      count(*) FILTER (WHERE l.status = 'failed'  AND l.logged_at > now() - interval '24 hours')::bigint AS failure_count_24h,
      ROUND(AVG(l.latency_ms) FILTER (WHERE l.logged_at > now() - interval '24 hours')::numeric, 0) AS avg_latency_ms_24h,
      MAX(l.logged_at) FILTER (WHERE l.status = 'success') AS last_success_at,
      MAX(l.logged_at) FILTER (WHERE l.status = 'failed')  AS last_failure_at,
      COUNT(DISTINCT l.team_id) FILTER (WHERE l.status = 'failed' AND l.logged_at > now() - interval '24 hours')::bigint AS affected_team_count
    FROM public.integration_health_logs l
    GROUP BY l.integration_name
  ),
  conn AS (
    SELECT
      'cc_athletics'::text AS integration_name,
      count(*) FILTER (WHERE cc_athletics_connected IS TRUE)::bigint AS team_connected_count
    FROM public.teams
    UNION ALL
    SELECT 'cal_com', count(*) FILTER (WHERE calcom_connected IS TRUE)::bigint FROM public.teams
    UNION ALL
    SELECT 'notificationapi', count(*) FILTER (WHERE notificationapi_connected IS TRUE)::bigint FROM public.teams
    UNION ALL
    SELECT 'lovable_ai_gateway', NULL::bigint
    UNION ALL
    SELECT 'supabase_edge_functions', NULL::bigint
  )
  SELECT
    n.integration_name,
    CASE
      WHEN coalesce(a.success_count_24h,0) = 0 AND coalesce(a.failure_count_24h,0) = 0 THEN 'inactive'
      WHEN coalesce(a.failure_count_24h,0) = 0 THEN 'healthy'
      WHEN a.failure_count_24h::numeric / NULLIF(a.success_count_24h + a.failure_count_24h,0) >= 0.5 THEN 'down'
      ELSE 'degraded'
    END AS status,
    coalesce(a.success_count_24h, 0)::bigint,
    coalesce(a.failure_count_24h, 0)::bigint,
    coalesce(a.avg_latency_ms_24h, 0)::numeric,
    a.last_success_at,
    a.last_failure_at,
    coalesce(a.affected_team_count, 0)::bigint,
    c.team_connected_count
  FROM all_names n
  LEFT JOIN agg a ON a.integration_name = n.integration_name
  LEFT JOIN conn c ON c.integration_name = n.integration_name
  ORDER BY n.integration_name;
END;
$function$;

-- Detail RPC: recent logs, failure reasons, affected orgs, payload sample
CREATE OR REPLACE FUNCTION public.get_integration_detail(integration_name_in text)
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
    'integration_name', integration_name_in,
    'recent_logs', (
      SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (
        SELECT l.id, l.status, l.latency_ms, l.failure_reason, l.logged_at,
               l.team_id, t.name AS organisation_name,
               (CASE WHEN jsonb_typeof(l.payload) = 'object'
                     THEN jsonb_strip_nulls(l.payload)
                     ELSE l.payload END) AS payload
        FROM public.integration_health_logs l
        LEFT JOIN public.teams t ON t.id = l.team_id
        WHERE l.integration_name = integration_name_in
        ORDER BY l.logged_at DESC
        LIMIT 50
      ) x
    ),
    'failure_reasons', (
      SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (
        SELECT failure_reason, count(*)::bigint AS occurrences,
               max(logged_at) AS last_seen
        FROM public.integration_health_logs
        WHERE integration_name = integration_name_in
          AND status = 'failed'
          AND logged_at > now() - interval '7 days'
          AND failure_reason IS NOT NULL
        GROUP BY failure_reason
        ORDER BY occurrences DESC
        LIMIT 10
      ) x
    ),
    'affected_organisations', (
      SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (
        SELECT l.team_id, t.name AS organisation_name,
               count(*)::bigint AS failure_count,
               max(l.logged_at) AS last_failure_at,
               (SELECT failure_reason FROM public.integration_health_logs il2
                WHERE il2.team_id = l.team_id
                  AND il2.integration_name = integration_name_in
                  AND il2.status = 'failed'
                ORDER BY il2.logged_at DESC LIMIT 1) AS last_failure_reason
        FROM public.integration_health_logs l
        LEFT JOIN public.teams t ON t.id = l.team_id
        WHERE l.integration_name = integration_name_in
          AND l.status = 'failed'
          AND l.logged_at > now() - interval '24 hours'
        GROUP BY l.team_id, t.name
        ORDER BY failure_count DESC
        LIMIT 20
      ) x
    ),
    'summary_24h', (
      SELECT json_build_object(
        'success', count(*) FILTER (WHERE status='success'),
        'failed',  count(*) FILTER (WHERE status='failed'),
        'avg_latency_ms', ROUND(AVG(latency_ms)::numeric, 0),
        'p95_latency_ms', ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 0)
      )
      FROM public.integration_health_logs
      WHERE integration_name = integration_name_in
        AND logged_at > now() - interval '24 hours'
    )
  ) INTO result;

  RETURN result;
END;
$function$;
