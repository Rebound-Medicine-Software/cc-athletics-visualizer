
CREATE OR REPLACE FUNCTION public.get_live_testing_overview()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE result json; v_day timestamptz := date_trunc('day', now()); v_month timestamptz := date_trunc('month', now());
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  SELECT json_build_object(
    'tests_today', (SELECT count(*) FROM public.test_data WHERE created_at >= v_day),
    'tests_this_month', (SELECT count(*) FROM public.test_data WHERE created_at >= v_month),
    'unique_athletes_today', (SELECT count(DISTINCT coalesce(athlete_id::text, athlete_name)) FROM public.test_data WHERE created_at >= v_day),
    'active_orgs_today', (SELECT count(DISTINCT team_name) FROM public.test_data WHERE created_at >= v_day),
    'failed_uploads_24h', (
      (SELECT count(*) FROM public.integration_health_logs WHERE logged_at >= now() - interval '24 hours' AND status IN ('error','failed'))
      + (SELECT count(*) FROM public.platform_activity_logs WHERE created_at >= now() - interval '24 hours' AND event_type IN ('test_upload_failed','test_ingest_failed'))
    ),
    'counts_by_test_type', (
      SELECT coalesce(json_agg(row_to_json(x)),'[]'::json) FROM (
        SELECT coalesce(test_type, test_name, 'Unknown') AS test_type, count(*)::bigint AS count
        FROM public.test_data
        WHERE created_at >= v_day
        GROUP BY 1 ORDER BY 2 DESC
      ) x
    )
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.list_recent_tests_global(row_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid, athlete_name text, team_name text, test_name text, test_type text,
  key_metric_label text, key_metric_value numeric, created_at timestamptz, athlete_id uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  RETURN QUERY
  SELECT
    td.id, td.athlete_name, td.team_name, td.test_name, td.test_type,
    CASE
      WHEN td.test_name ILIKE '%CMJ%' OR td.test_name ILIKE '%SJ%' OR td.test_name ILIKE '%DJ%' THEN 'Jump Height (cm)'
      WHEN td.test_name ILIKE '%IMTP%' THEN 'Peak Force (N)'
      WHEN td.test_name ILIKE '%RSI%' OR td.test_name ILIKE '%Pogo%' THEN 'RSI'
      ELSE 'Value'
    END AS key_metric_label,
    NULLIF(
      coalesce(
        (td.metrics->>'jump_height_cm')::numeric,
        (td.metrics->>'cmj_jump_height_cm')::numeric,
        (td.metrics->>'peak_force_n')::numeric,
        (td.metrics->>'imtp_peak_force_n')::numeric,
        (td.metrics->>'rsi')::numeric,
        (td.metrics->>'reactive_strength_index')::numeric
      ), 0)::numeric AS key_metric_value,
    td.created_at, td.athlete_id
  FROM public.test_data td
  ORDER BY td.created_at DESC
  LIMIT greatest(row_limit, 1);
END; $$;

CREATE OR REPLACE FUNCTION public.list_testing_anomalies(row_limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid, athlete_name text, team_name text, test_name text,
  anomaly_type text, severity text, detail text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT td.*,
      coalesce((td.metrics->>'jump_height_cm')::numeric, (td.metrics->>'cmj_jump_height_cm')::numeric) AS jh,
      coalesce((td.metrics->>'peak_force_n')::numeric, (td.metrics->>'imtp_peak_force_n')::numeric) AS pf,
      coalesce((td.metrics->>'rsi')::numeric, (td.metrics->>'reactive_strength_index')::numeric) AS rsi
    FROM public.test_data td
    WHERE td.created_at >= now() - interval '14 days'
  ),
  flagged AS (
    SELECT id, athlete_name, team_name, test_name, created_at,
      'Extreme CMJ jump height' AS anomaly_type, 'critical' AS severity,
      ('Jump height ' || jh || ' cm exceeds plausible range') AS detail
    FROM base WHERE jh IS NOT NULL AND (jh > 90 OR jh < 5) AND test_name ILIKE '%CMJ%'
    UNION ALL
    SELECT id, athlete_name, team_name, test_name, created_at,
      'Extreme IMTP peak force','critical',
      ('Peak force ' || pf || ' N outside expected band')
    FROM base WHERE pf IS NOT NULL AND (pf > 6500 OR pf < 200) AND test_name ILIKE '%IMTP%'
    UNION ALL
    SELECT id, athlete_name, team_name, test_name, created_at,
      'Extreme RSI value','warning',
      ('RSI ' || rsi || ' outside expected range')
    FROM base WHERE rsi IS NOT NULL AND (rsi > 4 OR rsi < 0)
    UNION ALL
    SELECT id, athlete_name, team_name, test_name, created_at,
      'Missing athlete linkage','warning',
      'test_data row has no athlete_id'
    FROM base WHERE athlete_id IS NULL
    UNION ALL
    SELECT id, athlete_name, team_name, test_name, created_at,
      'Empty key metrics','warning',
      'No CMJ / IMTP / RSI value found in metrics payload'
    FROM base WHERE jh IS NULL AND pf IS NULL AND rsi IS NULL
      AND (test_name ILIKE '%CMJ%' OR test_name ILIKE '%IMTP%' OR test_name ILIKE '%RSI%' OR test_name ILIKE '%DJ%' OR test_name ILIKE '%SJ%')
    UNION ALL
    SELECT b.id, b.athlete_name, b.team_name, b.test_name, b.created_at,
      'Likely duplicate upload','warning',
      ('Duplicate of test on ' || b.test_date::text)
    FROM base b
    WHERE EXISTS (
      SELECT 1 FROM base b2
      WHERE b2.id <> b.id
        AND b2.athlete_name = b.athlete_name
        AND b2.test_name = b.test_name
        AND b2.test_date = b.test_date
        AND b2.repetition_number = b.repetition_number
    )
  )
  SELECT * FROM flagged
  ORDER BY created_at DESC
  LIMIT greatest(row_limit, 1);
END; $$;
