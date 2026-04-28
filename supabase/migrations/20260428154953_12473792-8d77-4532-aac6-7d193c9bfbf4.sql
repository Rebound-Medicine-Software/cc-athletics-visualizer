
CREATE OR REPLACE FUNCTION public.get_athletes_overview()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_month_start timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;

  SELECT json_build_object(
    'total_athletes', (SELECT count(*) FROM public.athletes),
    'active_30d', (SELECT count(*) FROM public.athletes WHERE last_test_at >= now() - interval '30 days'),
    'inactive_athletes', (
      SELECT count(*) FROM public.athletes
      WHERE last_test_at IS NULL OR last_test_at < now() - interval '90 days'
    ),
    'consent_signed', (SELECT count(*) FROM public.athletes WHERE consent_status = 'signed'),
    'consent_pending', (SELECT count(*) FROM public.athletes WHERE consent_status <> 'signed' OR consent_status IS NULL),
    'consent_completion_rate', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE ROUND((count(*) FILTER (WHERE consent_status = 'signed'))::numeric / count(*) * 100, 1)
      END FROM public.athletes
    ),
    'reports_sent_total', (SELECT coalesce(sum(reports_sent_count),0)::bigint FROM public.athletes),
    'tested_this_month', (
      SELECT count(DISTINCT athlete_id) FROM public.test_data
      WHERE created_at >= v_month_start AND athlete_id IS NOT NULL
    ),
    'age_distribution', (
      SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (
        SELECT bucket AS name, count(*)::bigint AS value FROM (
          SELECT CASE
            WHEN age IS NULL THEN 'unknown'
            WHEN age < 14 THEN '<14'
            WHEN age BETWEEN 14 AND 17 THEN '14-17'
            WHEN age BETWEEN 18 AND 22 THEN '18-22'
            WHEN age BETWEEN 23 AND 29 THEN '23-29'
            WHEN age BETWEEN 30 AND 39 THEN '30-39'
            ELSE '40+'
          END AS bucket
          FROM public.athletes
        ) b
        GROUP BY bucket
        ORDER BY CASE bucket
          WHEN '<14' THEN 1 WHEN '14-17' THEN 2 WHEN '18-22' THEN 3
          WHEN '23-29' THEN 4 WHEN '30-39' THEN 5 WHEN '40+' THEN 6 ELSE 7 END
      ) x
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_athletes_global(
  filter_team_id uuid DEFAULT NULL,
  filter_consent text DEFAULT NULL,
  filter_activity text DEFAULT NULL,
  tested_this_month boolean DEFAULT NULL,
  search_text text DEFAULT NULL,
  row_limit integer DEFAULT 500
)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  team_id uuid,
  organisation_name text,
  practitioner_name text,
  practitioner_email text,
  consent_status text,
  last_test_at timestamptz,
  tests_logged bigint,
  reports_sent integer,
  activity_status text,
  age integer,
  gender text,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_month_start timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;

  RETURN QUERY
  WITH tests AS (
    SELECT athlete_id, count(*)::bigint AS c, max(created_at) AS last_at
    FROM public.test_data WHERE athlete_id IS NOT NULL
    GROUP BY athlete_id
  ),
  tests_mtd AS (
    SELECT DISTINCT athlete_id FROM public.test_data
    WHERE created_at >= v_month_start AND athlete_id IS NOT NULL
  )
  SELECT
    a.id, a.name, a.email, a.team_id,
    t.name AS organisation_name,
    p.full_name AS practitioner_name,
    p.email AS practitioner_email,
    coalesce(a.consent_status,'pending') AS consent_status,
    coalesce(a.last_test_at, te.last_at) AS last_test_at,
    coalesce(te.c, 0) AS tests_logged,
    coalesce(a.reports_sent_count, 0) AS reports_sent,
    CASE
      WHEN coalesce(a.last_test_at, te.last_at) >= now() - interval '30 days' THEN 'active'
      WHEN coalesce(a.last_test_at, te.last_at) >= now() - interval '90 days' THEN 'idle'
      ELSE 'dormant'
    END AS activity_status,
    a.age, a.gender, a.created_at
  FROM public.athletes a
  LEFT JOIN public.teams t ON t.id = a.team_id
  LEFT JOIN public.profiles p ON p.user_id = t.admin_id
  LEFT JOIN tests te ON te.athlete_id = a.id
  WHERE (filter_team_id IS NULL OR a.team_id = filter_team_id)
    AND (filter_consent IS NULL OR coalesce(a.consent_status,'pending') = filter_consent)
    AND (filter_activity IS NULL OR
      CASE
        WHEN coalesce(a.last_test_at, te.last_at) >= now() - interval '30 days' THEN 'active'
        WHEN coalesce(a.last_test_at, te.last_at) >= now() - interval '90 days' THEN 'idle'
        ELSE 'dormant'
      END = filter_activity)
    AND (tested_this_month IS NULL
      OR (tested_this_month = true AND a.id IN (SELECT athlete_id FROM tests_mtd))
      OR (tested_this_month = false AND a.id NOT IN (SELECT athlete_id FROM tests_mtd)))
    AND (search_text IS NULL OR search_text = ''
      OR a.name ILIKE '%' || search_text || '%'
      OR coalesce(a.email,'') ILIKE '%' || search_text || '%'
      OR coalesce(t.name,'') ILIKE '%' || search_text || '%')
  ORDER BY coalesce(a.last_test_at, te.last_at) DESC NULLS LAST, a.name
  LIMIT greatest(row_limit, 1);
END;
$$;
