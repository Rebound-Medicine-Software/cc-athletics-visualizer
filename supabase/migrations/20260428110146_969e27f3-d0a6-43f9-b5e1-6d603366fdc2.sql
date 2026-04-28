-- Revenue trend (active subscriptions snapshotted per day)
CREATE OR REPLACE FUNCTION public.get_revenue_trend(days_back int DEFAULT 90)
RETURNS TABLE (day date, total_revenue numeric, active_subscriptions bigint)
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
    COALESCE(SUM(b.monthly_value) FILTER (
      WHERE b.status = 'active' AND b.created_at::date <= s.d
    ), 0)::numeric AS total_revenue,
    COUNT(DISTINCT b.id) FILTER (
      WHERE b.status = 'active' AND b.created_at::date <= s.d
    )::bigint AS active_subscriptions
  FROM series s
  LEFT JOIN public.billing_subscriptions b ON true
  GROUP BY s.d
  ORDER BY s.d;
END;
$$;

-- Tests logged trend (counts per calendar day)
CREATE OR REPLACE FUNCTION public.get_tests_logged_trend(days_back int DEFAULT 90)
RETURNS TABLE (day date, tests_logged_count bigint)
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
    COUNT(t.id)::bigint AS tests_logged_count
  FROM series s
  LEFT JOIN public.test_data t
    ON t.test_date = s.d
  GROUP BY s.d
  ORDER BY s.d;
END;
$$;

-- Practitioner engagement trend (avg engagement, active practitioner count per day)
CREATE OR REPLACE FUNCTION public.get_practitioner_engagement_trend(days_back int DEFAULT 90)
RETURNS TABLE (day date, avg_engagement_score numeric, active_practitioner_count bigint)
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
    COALESCE(ROUND(AVG(h.engagement_score)::numeric, 1), 0)::numeric AS avg_engagement_score,
    COALESCE(SUM(h.practitioner_count) FILTER (WHERE h.engagement_score > 0), 0)::bigint AS active_practitioner_count
  FROM series s
  LEFT JOIN public.organisation_health_metrics h
    ON h.snapshot_date = s.d
  GROUP BY s.d
  ORDER BY s.d;
END;
$$;

-- Churn risk trend (avg churn risk, high-risk org count per day)
CREATE OR REPLACE FUNCTION public.get_churn_risk_trend(days_back int DEFAULT 90)
RETURNS TABLE (day date, avg_churn_risk numeric, high_risk_org_count bigint)
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
    COALESCE(ROUND(AVG(h.churn_risk_score)::numeric, 1), 0)::numeric AS avg_churn_risk,
    COUNT(*) FILTER (WHERE h.churn_risk_score >= 60)::bigint AS high_risk_org_count
  FROM series s
  LEFT JOIN public.organisation_health_metrics h
    ON h.snapshot_date = s.d
  GROUP BY s.d
  ORDER BY s.d;
END;
$$;

-- Restrict execution to authenticated users (RPC body further restricts to super admin)
REVOKE EXECUTE ON FUNCTION public.get_revenue_trend(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_tests_logged_trend(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_practitioner_engagement_trend(int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_churn_risk_trend(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_revenue_trend(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tests_logged_trend(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_practitioner_engagement_trend(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_churn_risk_trend(int) TO authenticated;