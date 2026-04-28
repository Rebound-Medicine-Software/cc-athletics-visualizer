
CREATE OR REPLACE FUNCTION public.get_practitioners_overview()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;

  SELECT json_build_object(
    'total_practitioners', (
      SELECT count(*) FROM public.profiles WHERE role IN ('practitioner','organisation')
    ),
    'active_7d', (
      SELECT count(DISTINCT le.user_id) FROM public.login_events le
      JOIN public.profiles p ON p.user_id = le.user_id
      WHERE p.role IN ('practitioner','organisation') AND le.created_at >= now() - interval '7 days'
    ),
    'inactive_practitioners', (
      SELECT count(*) FROM public.profiles p
      WHERE p.role IN ('practitioner','organisation')
        AND NOT EXISTS (
          SELECT 1 FROM public.login_events le
          WHERE le.user_id = p.user_id AND le.created_at >= now() - interval '30 days'
        )
    ),
    'pending_setup', (
      SELECT count(*) FROM public.profiles
      WHERE role IN ('practitioner','organisation') AND coalesce(setup_completed,false) = false
    ),
    'avg_caseload', (
      SELECT ROUND(AVG(caseload)::numeric, 1) FROM (
        SELECT p.user_id, count(a.id) AS caseload
        FROM public.profiles p
        LEFT JOIN public.athletes a ON a.team_id = p.team_id
        WHERE p.role IN ('practitioner','organisation')
        GROUP BY p.user_id
      ) c
    ),
    'avg_engagement_score', (
      SELECT ROUND(AVG(latest.engagement_score)::numeric, 1) FROM (
        SELECT DISTINCT ON (team_id) team_id, engagement_score
        FROM public.organisation_health_metrics
        ORDER BY team_id, snapshot_date DESC
      ) latest
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_practitioners_overview()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  role text,
  team_id uuid,
  organisation_name text,
  setup_completed boolean,
  created_at timestamptz,
  last_login_at timestamptz,
  caseload bigint,
  reports_sent bigint,
  engagement text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;

  RETURN QUERY
  WITH last_login AS (
    SELECT user_id, max(created_at) AS last_login_at
    FROM public.login_events GROUP BY user_id
  ),
  caseload AS (
    SELECT team_id, count(*)::bigint AS c FROM public.athletes
    WHERE team_id IS NOT NULL GROUP BY team_id
  ),
  reports AS (
    SELECT team_id, coalesce(sum(reports_sent_count),0)::bigint AS r
    FROM public.athletes WHERE team_id IS NOT NULL GROUP BY team_id
  ),
  latest_health AS (
    SELECT DISTINCT ON (team_id) team_id, engagement_score
    FROM public.organisation_health_metrics
    ORDER BY team_id, snapshot_date DESC
  )
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    p.role,
    p.team_id,
    t.name AS organisation_name,
    coalesce(p.setup_completed,false),
    p.created_at,
    ll.last_login_at,
    coalesce(c.c, 0)::bigint AS caseload,
    coalesce(r.r, 0)::bigint AS reports_sent,
    CASE
      WHEN lh.engagement_score IS NULL THEN 'unknown'
      WHEN lh.engagement_score >= 70 THEN 'high'
      WHEN lh.engagement_score >= 40 THEN 'med'
      ELSE 'low'
    END AS engagement
  FROM public.profiles p
  LEFT JOIN public.teams t ON t.id = p.team_id
  LEFT JOIN last_login ll ON ll.user_id = p.user_id
  LEFT JOIN caseload c ON c.team_id = p.team_id
  LEFT JOIN reports r ON r.team_id = p.team_id
  LEFT JOIN latest_health lh ON lh.team_id = p.team_id
  WHERE p.role IN ('practitioner','organisation')
  ORDER BY ll.last_login_at DESC NULLS LAST, p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_practitioner_engagement_trends(days_back integer DEFAULT 84)
RETURNS TABLE(day date, active_count bigint, avg_engagement numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (current_date - (days_back - 1) * interval '1 day')::date,
      current_date, interval '1 day'
    )::date AS d
  )
  SELECT
    s.d,
    COALESCE((
      SELECT count(DISTINCT le.user_id) FROM public.login_events le
      JOIN public.profiles p ON p.user_id = le.user_id
      WHERE p.role IN ('practitioner','organisation') AND le.created_at::date = s.d
    ), 0)::bigint,
    COALESCE((
      SELECT ROUND(AVG(engagement_score)::numeric, 1)
      FROM public.organisation_health_metrics WHERE snapshot_date = s.d
    ), 0)::numeric
  FROM series s
  ORDER BY s.d;
END;
$$;
