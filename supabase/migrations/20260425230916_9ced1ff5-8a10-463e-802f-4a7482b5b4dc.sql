-- Platform activity logs
create table if not exists public.platform_activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_source text,
  team_id uuid,
  organisation_name text,
  user_id uuid,
  athlete_id uuid,
  metadata jsonb default '{}'::jsonb,
  severity text default 'info',
  created_at timestamp with time zone default now()
);

-- Platform alerts
create table if not exists public.platform_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null,
  team_id uuid,
  related_record_id uuid,
  title text,
  description text,
  is_resolved boolean default false,
  resolved_by uuid,
  created_at timestamp with time zone default now()
);

-- Organisation health snapshots
create table if not exists public.organisation_health_metrics (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  snapshot_date date not null,
  practitioner_count int default 0,
  athlete_count int default 0,
  tests_logged int default 0,
  reports_generated int default 0,
  ai_requests int default 0,
  bookings_count int default 0,
  revenue numeric default 0,
  login_count int default 0,
  engagement_score numeric default 0,
  churn_risk_score numeric default 0,
  consent_completion_rate numeric default 0,
  api_failure_count int default 0
);

-- Integration health logs
create table if not exists public.integration_health_logs (
  id uuid primary key default gen_random_uuid(),
  integration_name text not null,
  team_id uuid,
  status text,
  latency_ms int,
  failure_reason text,
  payload jsonb default '{}'::jsonb,
  logged_at timestamp with time zone default now()
);

-- Billing subscriptions
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier_name text,
  monthly_value numeric default 0,
  status text,
  seat_count int default 1,
  renewal_date timestamp with time zone,
  payment_status text,
  created_at timestamp with time zone default now()
);

-- Impersonation logs
create table if not exists public.super_admin_impersonation_logs (
  id uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null,
  team_id uuid not null,
  impersonated_user_id uuid,
  reason text,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone
);

-- Support tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  opened_by uuid,
  subject text,
  priority text default 'normal',
  status text default 'open',
  assigned_to uuid,
  conversation jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Benchmark warehouse
create table if not exists public.benchmark_data_warehouse (
  id uuid primary key default gen_random_uuid(),
  sport text,
  age_group text,
  weight_category text,
  country text,
  region text,
  test_type text,
  metric_name text,
  metric_value numeric,
  source_test_id uuid,
  team_id uuid,
  is_elite boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS on all
alter table public.platform_activity_logs enable row level security;
alter table public.platform_alerts enable row level security;
alter table public.organisation_health_metrics enable row level security;
alter table public.integration_health_logs enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.super_admin_impersonation_logs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.benchmark_data_warehouse enable row level security;

-- Super admin manage policies
create policy "super admins manage platform_activity_logs" on public.platform_activity_logs
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role platform_activity_logs" on public.platform_activity_logs
  for all using (auth.role() = 'service_role');

create policy "super admins manage platform_alerts" on public.platform_alerts
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role platform_alerts" on public.platform_alerts
  for all using (auth.role() = 'service_role');

create policy "super admins manage organisation_health_metrics" on public.organisation_health_metrics
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role organisation_health_metrics" on public.organisation_health_metrics
  for all using (auth.role() = 'service_role');

create policy "super admins manage integration_health_logs" on public.integration_health_logs
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role integration_health_logs" on public.integration_health_logs
  for all using (auth.role() = 'service_role');

create policy "super admins manage billing_subscriptions" on public.billing_subscriptions
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role billing_subscriptions" on public.billing_subscriptions
  for all using (auth.role() = 'service_role');

create policy "super admins manage impersonation_logs" on public.super_admin_impersonation_logs
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role impersonation_logs" on public.super_admin_impersonation_logs
  for all using (auth.role() = 'service_role');

create policy "super admins manage support_tickets" on public.support_tickets
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role support_tickets" on public.support_tickets
  for all using (auth.role() = 'service_role');

create policy "super admins manage benchmark_warehouse" on public.benchmark_data_warehouse
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "service role benchmark_warehouse" on public.benchmark_data_warehouse
  for all using (auth.role() = 'service_role');