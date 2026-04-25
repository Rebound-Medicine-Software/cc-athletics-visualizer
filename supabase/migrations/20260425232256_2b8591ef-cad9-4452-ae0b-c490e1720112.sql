-- ============================================
-- MIGRATION 06 — PLATFORM RPC FUNCTIONS
-- ============================================

-- ===== get_platform_kpis =====
create or replace function public.get_platform_kpis()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    result json;
begin
    if not public.is_super_admin() then
        raise exception 'unauthorised';
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
        'monthly_ai_requests', 0,
        'monthly_revenue', (
            select coalesce(sum(monthly_value),0)
            from public.billing_subscriptions
            where status = 'active'
        ),
        'failed_integrations', (
            select count(*) from public.integration_health_logs
            where status = 'failed'
              and logged_at > now() - interval '24 hours'
        )
    ) into result;

    return result;
end;
$$;

-- ===== get_global_activity_feed =====
create or replace function public.get_global_activity_feed(limit_count int default 20)
returns setof public.platform_activity_logs
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_super_admin() then
        raise exception 'unauthorised';
    end if;

    return query
    select *
    from public.platform_activity_logs
    order by created_at desc
    limit limit_count;
end;
$$;

-- ===== get_platform_alerts =====
create or replace function public.get_platform_alerts()
returns setof public.platform_alerts
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_super_admin() then
        raise exception 'unauthorised';
    end if;

    return query
    select *
    from public.platform_alerts
    where is_resolved = false
    order by created_at desc;
end;
$$;
