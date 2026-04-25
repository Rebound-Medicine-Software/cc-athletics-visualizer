create or replace function public.get_organisation_health()
returns table (
    team_id uuid,
    organisation_name text,
    subscription_status text,
    organisation_status text,
    practitioner_count bigint,
    athlete_count bigint,
    tests_logged bigint,
    monthly_revenue numeric,
    churn_risk numeric,
    last_activity timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_super_admin() then
        raise exception 'unauthorised';
    end if;

    return query
    select
        t.id,
        t.name,
        t.subscription_status,
        t.organisation_status,
        (select count(*) from public.profiles p
            where p.team_id = t.id
              and p.role in ('practitioner','organisation')),
        (select count(*) from public.athletes a where a.team_id = t.id),
        (select count(*) from public.test_data td
            join public.athletes a on a.id = td.athlete_id
            where a.team_id = t.id
              and td.created_at > date_trunc('month', now())),
        coalesce((select b.monthly_value from public.billing_subscriptions b
            where b.team_id = t.id
            order by b.created_at desc
            limit 1), 0),
        t.churn_risk_score,
        t.last_activity_at
    from public.teams t;
end;
$$;
