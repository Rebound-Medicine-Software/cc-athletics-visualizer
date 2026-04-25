create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.super_admin_users sa
    where sa.auth_user_id = auth.uid()
      and sa.is_active = true
  );
$$;

create or replace function public.can_access_team_row(row_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_super_admin()
    or row_team_id = public.get_my_team_id();
$$;