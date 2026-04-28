CREATE OR REPLACE FUNCTION public.list_organisations_overview()
 RETURNS TABLE (
   id uuid,
   name text,
   cc_team_id text,
   country text,
   primary_color text,
   subscription_status text,
   organisation_status text,
   tier_name text,
   owner_email text,
   owner_full_name text,
   practitioner_count bigint,
   athlete_count bigint,
   tests_this_month bigint,
   monthly_revenue numeric,
   last_activity_at timestamptz,
   created_at timestamptz,
   churn_risk_score numeric,
   cc_athletics_status text,
   calcom_status text,
   notificationapi_status text
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
  WITH practitioners AS (
    SELECT team_id, count(*)::bigint AS c
    FROM public.profiles
    WHERE role IN ('practitioner','organisation') AND team_id IS NOT NULL
    GROUP BY team_id
  ),
  athletes_agg AS (
    SELECT team_id, count(*)::bigint AS c
    FROM public.athletes WHERE team_id IS NOT NULL
    GROUP BY team_id
  ),
  tests_mtd AS (
    SELECT a.team_id, count(td.id)::bigint AS c
    FROM public.test_data td
    JOIN public.athletes a ON a.id = td.athlete_id
    WHERE td.created_at >= date_trunc('month', now())
      AND a.team_id IS NOT NULL
    GROUP BY a.team_id
  ),
  revenue AS (
    SELECT team_id, coalesce(sum(monthly_value),0)::numeric AS v
    FROM public.billing_subscriptions
    WHERE status = 'active'
    GROUP BY team_id
  ),
  latest_sub AS (
    SELECT DISTINCT ON (team_id) team_id, tier_name
    FROM public.billing_subscriptions
    ORDER BY team_id, created_at DESC
  ),
  integrations_24h AS (
    SELECT team_id, integration_name,
           count(*) FILTER (WHERE status = 'failed')::bigint AS failures
    FROM public.integration_health_logs
    WHERE logged_at > now() - interval '24 hours'
      AND team_id IS NOT NULL
    GROUP BY team_id, integration_name
  )
  SELECT
    t.id,
    t.name,
    t.cc_team_id,
    t.country,
    t.primary_color,
    t.subscription_status,
    t.organisation_status,
    coalesce(ti.name, ls.tier_name) AS tier_name,
    op.email AS owner_email,
    op.full_name AS owner_full_name,
    coalesce(pr.c, 0) AS practitioner_count,
    coalesce(aa.c, 0) AS athlete_count,
    coalesce(tm.c, 0) AS tests_this_month,
    coalesce(rv.v, 0) AS monthly_revenue,
    t.last_activity_at,
    t.created_at,
    coalesce(t.churn_risk_score, 0) AS churn_risk_score,
    CASE
      WHEN t.cc_athletics_connected IS NOT TRUE THEN 'off'
      WHEN coalesce((SELECT failures FROM integrations_24h i
                     WHERE i.team_id = t.id AND i.integration_name = 'cc_athletics'),0) > 0 THEN 'down'
      ELSE 'ok'
    END AS cc_athletics_status,
    CASE
      WHEN t.calcom_connected IS NOT TRUE THEN 'off'
      WHEN coalesce((SELECT failures FROM integrations_24h i
                     WHERE i.team_id = t.id AND i.integration_name = 'calcom'),0) > 0 THEN 'down'
      ELSE 'ok'
    END AS calcom_status,
    CASE
      WHEN t.notificationapi_connected IS NOT TRUE THEN 'off'
      WHEN coalesce((SELECT failures FROM integrations_24h i
                     WHERE i.team_id = t.id AND i.integration_name = 'notificationapi'),0) > 0 THEN 'down'
      ELSE 'ok'
    END AS notificationapi_status
  FROM public.teams t
  LEFT JOIN public.tiers ti ON ti.id = t.tier_id
  LEFT JOIN latest_sub ls ON ls.team_id = t.id
  LEFT JOIN public.profiles op ON op.user_id = t.admin_id
  LEFT JOIN practitioners pr ON pr.team_id = t.id
  LEFT JOIN athletes_agg aa ON aa.team_id = t.id
  LEFT JOIN tests_mtd tm ON tm.team_id = t.id
  LEFT JOIN revenue rv ON rv.team_id = t.id
  ORDER BY t.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_organisations_kpis()
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
    'total', (SELECT count(*) FROM public.teams),
    'trial', (SELECT count(*) FROM public.teams WHERE subscription_status = 'trial'),
    'paying', (SELECT count(*) FROM public.teams WHERE subscription_status = 'active'),
    'suspended', (SELECT count(*) FROM public.teams
                   WHERE subscription_status IN ('suspended','cancelled','past_due')
                      OR organisation_status IN ('suspended','disabled')),
    'mrr', (SELECT coalesce(sum(monthly_value),0)::numeric
              FROM public.billing_subscriptions WHERE status = 'active')
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_organisations_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_organisations_kpis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_organisations_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organisations_kpis() TO authenticated;