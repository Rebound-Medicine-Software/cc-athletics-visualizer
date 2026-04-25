-- Super Admin Users foundation table
create table if not exists public.super_admin_users (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid unique not null,
    full_name text,
    email text unique not null,
    role text not null default 'support',
    permissions jsonb default '{}'::jsonb,
    is_active boolean default true,
    last_login timestamp with time zone,
    created_at timestamp with time zone default now()
);

alter table public.super_admin_users enable row level security;

-- Security definer helper to avoid recursive RLS lookups
create or replace function public.is_super_admin_owner(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.super_admin_users
    where auth_user_id = _user_id
      and role = 'owner'
      and is_active = true
  );
$$;

create policy "super admins can read super_admin_users"
on public.super_admin_users
for select
using (
  auth.uid() = auth_user_id
  or public.is_super_admin_owner(auth.uid())
);

create policy "owners can manage super_admin_users"
on public.super_admin_users
for all
using (public.is_super_admin_owner(auth.uid()))
with check (public.is_super_admin_owner(auth.uid()));