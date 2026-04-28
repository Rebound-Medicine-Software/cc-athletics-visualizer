
-- Phase H8: Billing live operations RPCs

CREATE OR REPLACE FUNCTION public.get_billing_overview()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_mrr numeric;
  v_active bigint;
  v_org_count bigint;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT coalesce(sum(monthly_value),0)::numeric, count(*)::bigint
    INTO v_mrr, v_active
    FROM public.billing_subscriptions
    WHERE status = 'active';

  SELECT count(*)::bigint INTO v_org_count
    FROM public.teams;

  SELECT json_build_object(
    'mrr', coalesce(v_mrr, 0),
    'arr', coalesce(v_mrr, 0) * 12,
    'active_subscriptions', coalesce(v_active, 0),
    'trial_accounts', (
      SELECT count(*)::bigint FROM public.teams WHERE subscription_status = 'trial'
    ),
    'failed_payments', (
      SELECT count(*)::bigint FROM public.billing_subscriptions
      WHERE coalesce(payment_status,'') IN ('failed','past_due')
         OR status IN ('past_due','unpaid')
    ),
    'total_seats', (
      SELECT coalesce(sum(seat_count),0)::bigint FROM public.billing_subscriptions WHERE status='active'
    ),
    'avg_revenue_per_org', CASE WHEN v_org_count > 0 THEN ROUND((coalesce(v_mrr,0) / v_org_count)::numeric, 2) ELSE 0 END,
    'organisation_count', v_org_count,
    'stripe_connected', false
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_billing_subscriptions()
RETURNS TABLE(
  id uuid,
  team_id uuid,
  organisation_name text,
  tier_name text,
  monthly_value numeric,
  status text,
  payment_status text,
  seat_count integer,
  renewal_date timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  last_activity_at timestamptz,
  churn_risk_score numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.team_id,
    t.name AS organisation_name,
    b.tier_name,
    coalesce(b.monthly_value,0)::numeric,
    coalesce(b.status,'unknown'),
    b.payment_status,
    coalesce(b.seat_count,1),
    b.renewal_date,
    b.stripe_customer_id,
    b.stripe_subscription_id,
    t.last_activity_at,
    coalesce(t.churn_risk_score,0)::numeric,
    b.created_at
  FROM public.billing_subscriptions b
  LEFT JOIN public.teams t ON t.id = b.team_id
  ORDER BY b.created_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tier_distribution()
RETURNS TABLE(
  tier_name text,
  organisation_count bigint,
  monthly_revenue numeric,
  avg_seats numeric,
  percentage_of_total numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT count(*)::bigint INTO v_total FROM public.teams;

  RETURN QUERY
  WITH tier_names AS (
    SELECT DISTINCT name AS tier_name FROM public.tiers WHERE name IS NOT NULL
    UNION
    SELECT DISTINCT b.tier_name FROM public.billing_subscriptions b WHERE b.tier_name IS NOT NULL
  ),
  agg AS (
    SELECT
      lower(b.tier_name) AS k,
      count(DISTINCT b.team_id)::bigint AS org_count,
      coalesce(sum(b.monthly_value) FILTER (WHERE b.status='active'),0)::numeric AS rev,
      coalesce(ROUND(AVG(b.seat_count)::numeric, 1), 0)::numeric AS avg_seats
    FROM public.billing_subscriptions b
    GROUP BY lower(b.tier_name)
  )
  SELECT
    n.tier_name,
    coalesce(a.org_count, 0)::bigint,
    coalesce(a.rev, 0)::numeric,
    coalesce(a.avg_seats, 0)::numeric,
    CASE WHEN v_total > 0 THEN ROUND((coalesce(a.org_count,0)::numeric / v_total) * 100, 1) ELSE 0 END
  FROM tier_names n
  LEFT JOIN agg a ON a.k = lower(n.tier_name)
  ORDER BY n.tier_name;
END;
$$;
