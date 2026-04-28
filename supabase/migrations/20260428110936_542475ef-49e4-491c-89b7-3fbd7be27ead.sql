CREATE OR REPLACE FUNCTION public.get_platform_kpis()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    result json;
    v_monthly_bookings bigint;
    v_booking_limit numeric;
    v_utilisation numeric;
begin
    if not public.is_super_admin() then
        raise exception 'unauthorised';
    end if;

    -- Current month bookings (canonical: public.bookings)
    select count(*) into v_monthly_bookings
    from public.bookings
    where appointment_date >= date_trunc('month', now())
      and appointment_date <  date_trunc('month', now()) + interval '1 month'
      and coalesce(status, 'scheduled') <> 'cancelled';

    -- Sum of booking limits across active subscriptions' tiers (denominator).
    -- Uses billing_subscriptions.tier_name -> tiers.name (case-insensitive).
    -- Returns null if no reliable limit exists.
    select nullif(sum(t.max_bookings_per_month * coalesce(b.seat_count, 1)), 0)
    into v_booking_limit
    from public.billing_subscriptions b
    join public.tiers t
      on lower(t.name) = lower(b.tier_name)
     and (t.team_id = b.team_id or t.team_id is null)
    where b.status = 'active'
      and t.max_bookings_per_month is not null
      and t.max_bookings_per_month > 0;

    if v_booking_limit is not null and v_booking_limit > 0 then
        v_utilisation := round((v_monthly_bookings::numeric / v_booking_limit) * 100, 1);
    else
        v_utilisation := null;
    end if;

    select json_build_object(
        'total_organisations', (select count(*) from public.teams),
        'active_organisations', (
            select count(*) from public.teams
            where last_activity_at > now() - interval '30 days'
        ),
        'total_practitioners', (
            select count(*) from public.profiles
            where role in ('practitioner','organisation')
        ),
        'total_athletes', (select count(*) from public.athletes),
        'monthly_tests_logged', (
            select count(*) from public.test_data
            where created_at > date_trunc('month', now())
        ),
        'monthly_reports_generated', 0,
        'monthly_ai_requests', (
            select count(*) from public.platform_activity_logs
            where event_type = 'ai_coach_insight_generated'
              and created_at >= date_trunc('month', now())
        ),
        'monthly_revenue', (
            select coalesce(sum(monthly_value),0)
            from public.billing_subscriptions
            where status = 'active'
        ),
        'failed_integrations', (
            select count(*) from public.integration_health_logs
            where status = 'failed'
              and logged_at > now() - interval '24 hours'
        ),
        'monthly_bookings_count', v_monthly_bookings,
        'booking_utilisation_percent', v_utilisation
    ) into result;

    return result;
end;
$function$;