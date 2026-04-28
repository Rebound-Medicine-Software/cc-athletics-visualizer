-- =========================================================
-- Phase H10: Reports & AI Engine RPCs
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_reports_ai_overview()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_month_start timestamptz := date_trunc('month', now());
  v_24h timestamptz := now() - interval '24 hours';
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT json_build_object(
    'reports_generated_month', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE event_type = 'report_generated' AND created_at >= v_month_start
    ),
    'reports_sent_month', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE event_type = 'report_email_sent' AND created_at >= v_month_start
    ),
    'ai_insights_month', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE event_type = 'ai_coach_insight_generated' AND created_at >= v_month_start
    ),
    'failed_report_jobs_24h', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE event_type = 'report_generation_failed' AND created_at >= v_24h
    ),
    'failed_report_emails_24h', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE event_type = 'report_email_failed' AND created_at >= v_24h
    ),
    'failed_ai_insights_24h', (
      SELECT count(*) FROM public.platform_activity_logs
      WHERE event_type = 'ai_coach_insight_failed' AND created_at >= v_24h
    ),
    'avg_report_duration_ms', (
      SELECT ROUND(AVG((metadata->>'duration_ms')::numeric)::numeric, 0)
      FROM public.platform_activity_logs
      WHERE event_type = 'report_generated'
        AND created_at >= v_month_start
        AND metadata ? 'duration_ms'
        AND (metadata->>'duration_ms') ~ '^[0-9]+(\.[0-9]+)?$'
    ),
    'reports_sent_total', (
      SELECT coalesce(sum(reports_sent_count),0)::bigint FROM public.athletes
    ),
    'top_organisations', (
      SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (
        SELECT
          a.team_id,
          coalesce(t.name, a.organisation_name, 'Unknown') AS organisation_name,
          count(*)::bigint AS reports_generated
        FROM public.platform_activity_logs a
        LEFT JOIN public.teams t ON t.id = a.team_id
        WHERE a.event_type = 'report_generated'
          AND a.created_at >= v_month_start
        GROUP BY a.team_id, t.name, a.organisation_name
        ORDER BY count(*) DESC
        LIMIT 5
      ) x
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =========================================================
CREATE OR REPLACE FUNCTION public.list_reports_ai_activity(row_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  event_type text,
  event_source text,
  severity text,
  team_id uuid,
  organisation_name text,
  athlete_id uuid,
  user_id uuid,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.event_type,
    a.event_source,
    coalesce(a.severity,'info'),
    a.team_id,
    coalesce(a.organisation_name, (SELECT name FROM public.teams t WHERE t.id = a.team_id)) AS organisation_name,
    a.athlete_id,
    a.user_id,
    coalesce(a.metadata,'{}'::jsonb),
    a.created_at
  FROM public.platform_activity_logs a
  WHERE a.event_type IN (
    'report_generated','report_generation_failed',
    'report_email_sent','report_email_failed',
    'ai_coach_insight_generated','ai_coach_insight_failed'
  )
  ORDER BY a.created_at DESC
  LIMIT greatest(row_limit, 1);
END;
$$;

-- =========================================================
CREATE OR REPLACE FUNCTION public.get_reports_ai_trends(days_back integer DEFAULT 30)
RETURNS TABLE(
  day date,
  reports_generated bigint,
  reports_sent bigint,
  ai_insights bigint,
  failures bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (current_date - (days_back - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date AS d
  )
  SELECT
    s.d,
    count(*) FILTER (WHERE a.event_type = 'report_generated')::bigint,
    count(*) FILTER (WHERE a.event_type = 'report_email_sent')::bigint,
    count(*) FILTER (WHERE a.event_type = 'ai_coach_insight_generated')::bigint,
    count(*) FILTER (WHERE a.event_type IN (
      'report_generation_failed','report_email_failed','ai_coach_insight_failed'
    ))::bigint
  FROM series s
  LEFT JOIN public.platform_activity_logs a
    ON a.created_at::date = s.d
   AND a.event_type IN (
     'report_generated','report_generation_failed',
     'report_email_sent','report_email_failed',
     'ai_coach_insight_generated','ai_coach_insight_failed'
   )
  GROUP BY s.d
  ORDER BY s.d;
END;
$$;