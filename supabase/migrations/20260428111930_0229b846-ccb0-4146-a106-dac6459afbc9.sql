CREATE OR REPLACE FUNCTION public.get_organisation_detail(team_uuid uuid)
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
        'organisation', (
            SELECT json_build_object(
                'id', t.id,
                'name', t.name,
                'cc_team_id', t.cc_team_id,
                'country', t.country,
                'region', t.region,
                'city', t.city,
                'logo_url', t.logo_url,
                'primary_color', t.primary_color,
                'subscription_status', t.subscription_status,
                'organisation_status', t.organisation_status,
                'churn_risk_score', t.churn_risk_score,
                'created_at', t.created_at,
                'last_activity_at', t.last_activity_at,
                'tier_name', (SELECT ti.name FROM public.tiers ti WHERE ti.id = t.tier_id),
                'owner_email', (
                    SELECT p.email FROM public.profiles p
                    WHERE p.user_id = t.admin_id
                    LIMIT 1
                ),
                'owner_full_name', (
                    SELECT p.full_name FROM public.profiles p
                    WHERE p.user_id = t.admin_id
                    LIMIT 1
                ),
                'cc_athletics_connected', t.cc_athletics_connected,
                'calcom_connected', t.calcom_connected,
                'notificationapi_connected', t.notificationapi_connected
            )
            FROM public.teams t
            WHERE t.id = team_uuid
        ),
        'practitioner_count', (
            SELECT count(*) FROM public.profiles
            WHERE team_id = team_uuid AND role IN ('practitioner','organisation')
        ),
        'athlete_count', (
            SELECT count(*) FROM public.athletes WHERE team_id = team_uuid
        ),
        'tests_this_month', (
            SELECT count(*)
            FROM public.test_data td
            JOIN public.athletes a ON a.id = td.athlete_id
            WHERE a.team_id = team_uuid
              AND td.created_at >= date_trunc('month', now())
        ),
        'bookings_this_month', (
            SELECT count(*) FROM public.bookings
            WHERE team_id = team_uuid
              AND appointment_date >= date_trunc('month', now())
              AND appointment_date <  date_trunc('month', now()) + interval '1 month'
              AND coalesce(status, 'scheduled') <> 'cancelled'
        ),
        'reports_sent_total', (
            SELECT coalesce(sum(reports_sent_count),0)::bigint
            FROM public.athletes WHERE team_id = team_uuid
        ),
        'monthly_revenue', (
            SELECT coalesce(sum(monthly_value),0)::numeric
            FROM public.billing_subscriptions
            WHERE team_id = team_uuid AND status = 'active'
        ),
        'subscription', (
            SELECT json_build_object(
                'tier_name', b.tier_name,
                'status', b.status,
                'payment_status', b.payment_status,
                'monthly_value', b.monthly_value,
                'seat_count', b.seat_count,
                'renewal_date', b.renewal_date
            )
            FROM public.billing_subscriptions b
            WHERE b.team_id = team_uuid
            ORDER BY b.created_at DESC
            LIMIT 1
        ),
        'latest_health', (
            SELECT json_build_object(
                'snapshot_date', h.snapshot_date,
                'practitioner_count', h.practitioner_count,
                'athlete_count', h.athlete_count,
                'tests_logged', h.tests_logged,
                'bookings_count', h.bookings_count,
                'reports_generated', h.reports_generated,
                'ai_requests', h.ai_requests,
                'login_count', h.login_count,
                'revenue', h.revenue,
                'engagement_score', h.engagement_score,
                'churn_risk_score', h.churn_risk_score,
                'consent_completion_rate', h.consent_completion_rate,
                'api_failure_count', h.api_failure_count
            )
            FROM public.organisation_health_metrics h
            WHERE h.team_id = team_uuid
            ORDER BY h.snapshot_date DESC
            LIMIT 1
        ),
        'recent_activity', (
            SELECT coalesce(json_agg(row_to_json(x)), '[]'::json)
            FROM (
                SELECT id, event_type, event_source, severity, metadata,
                       organisation_name, created_at
                FROM public.platform_activity_logs
                WHERE team_id = team_uuid
                ORDER BY created_at DESC
                LIMIT 15
            ) x
        ),
        'unresolved_alerts', (
            SELECT coalesce(json_agg(row_to_json(x)), '[]'::json)
            FROM (
                SELECT id, alert_type, severity, title, description, created_at
                FROM public.platform_alerts
                WHERE team_id = team_uuid AND is_resolved = false
                ORDER BY created_at DESC
                LIMIT 10
            ) x
        ),
        'integration_health', (
            SELECT coalesce(json_agg(row_to_json(x)), '[]'::json)
            FROM (
                SELECT integration_name,
                       count(*) FILTER (WHERE status = 'failed')::bigint AS failure_count,
                       count(*) FILTER (WHERE status = 'success')::bigint AS success_count,
                       max(logged_at) AS last_logged_at,
                       (SELECT failure_reason FROM public.integration_health_logs il2
                         WHERE il2.team_id = team_uuid
                           AND il2.integration_name = il.integration_name
                           AND il2.status = 'failed'
                         ORDER BY il2.logged_at DESC LIMIT 1) AS last_failure_reason
                FROM public.integration_health_logs il
                WHERE il.team_id = team_uuid
                  AND il.logged_at > now() - interval '24 hours'
                GROUP BY integration_name
                ORDER BY integration_name
            ) x
        )
    ) INTO result;

    RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_organisation_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organisation_detail(uuid) TO authenticated;