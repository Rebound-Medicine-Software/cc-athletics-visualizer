
CREATE OR REPLACE FUNCTION public.get_analytics_warehouse_overview()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE result json; v_month timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  SELECT json_build_object(
    'total_test_records', (SELECT count(*) FROM public.test_data),
    'total_benchmark_records', (SELECT count(*) FROM public.benchmark_data_warehouse),
    'elite_benchmark_athletes', (SELECT count(DISTINCT athlete_name) FROM public.elite_athlete_data),
    'active_sports', (SELECT count(DISTINCT sport) FROM public.elite_athlete_data WHERE sport IS NOT NULL),
    'countries', (SELECT count(DISTINCT country) FROM public.teams WHERE country IS NOT NULL),
    'regions', (SELECT count(DISTINCT region) FROM public.teams WHERE region IS NOT NULL),
    'tests_this_month', (SELECT count(*) FROM public.test_data WHERE created_at >= v_month)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.get_sport_benchmark_distribution()
RETURNS TABLE(sport text, test_count bigint, athlete_count bigint, avg_cmj_height numeric, avg_imtp_peak numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  RETURN QUERY
  SELECT
    coalesce(e.sport,'Unknown') AS sport,
    coalesce((SELECT count(*) FROM public.benchmark_data_warehouse b WHERE b.sport = e.sport),0)::bigint AS test_count,
    count(DISTINCT e.athlete_name)::bigint AS athlete_count,
    round(avg(e.cmj_jump_height_cm)::numeric, 1) AS avg_cmj_height,
    round(avg(e.imtp_peak_force_n)::numeric, 0) AS avg_imtp_peak
  FROM public.elite_athlete_data e
  WHERE e.sport IS NOT NULL
  GROUP BY e.sport
  ORDER BY athlete_count DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_regional_testing_distribution()
RETURNS TABLE(country text, region text, organisation_count bigint, athlete_count bigint, test_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  RETURN QUERY
  SELECT
    coalesce(t.country,'Unknown') AS country,
    coalesce(t.region,'—') AS region,
    count(DISTINCT t.id)::bigint AS organisation_count,
    coalesce((SELECT count(*) FROM public.athletes a WHERE a.team_id IN (SELECT id FROM public.teams WHERE coalesce(country,'Unknown') = coalesce(t.country,'Unknown'))),0)::bigint AS athlete_count,
    coalesce((SELECT count(*) FROM public.test_data td JOIN public.athletes a ON a.id = td.athlete_id WHERE a.team_id IN (SELECT id FROM public.teams WHERE coalesce(country,'Unknown') = coalesce(t.country,'Unknown'))),0)::bigint AS test_count
  FROM public.teams t
  GROUP BY t.country, t.region
  ORDER BY athlete_count DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.get_elite_benchmark_summary()
RETURNS TABLE(sport text, age_group integer, weight_category text, athlete_count bigint, avg_cmj_height numeric, avg_cmj_peak_power numeric, avg_imtp_peak numeric, avg_imtp_relative numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  RETURN QUERY
  SELECT
    coalesce(e.sport,'Unknown') AS sport,
    e.age_group,
    coalesce(e.weight_category,'—') AS weight_category,
    count(DISTINCT e.athlete_name)::bigint AS athlete_count,
    round(avg(e.cmj_jump_height_cm)::numeric, 1) AS avg_cmj_height,
    round(avg(e.cmj_peak_power_w)::numeric, 0) AS avg_cmj_peak_power,
    round(avg(e.imtp_peak_force_n)::numeric, 0) AS avg_imtp_peak,
    round(avg(e.imtp_relative_peak_force_n_per_kg)::numeric, 2) AS avg_imtp_relative
  FROM public.elite_athlete_data e
  GROUP BY e.sport, e.age_group, e.weight_category
  ORDER BY sport, age_group NULLS LAST, weight_category;
END; $$;
