alter table public.teams
  add column if not exists subscription_status text default 'trial',
  add column if not exists tier_id uuid,
  add column if not exists owner_user_id uuid,
  add column if not exists organisation_status text default 'active',
  add column if not exists last_activity_at timestamp with time zone,
  add column if not exists churn_risk_score numeric default 0,
  add column if not exists cc_athletics_connected boolean default false,
  add column if not exists calcom_connected boolean default false,
  add column if not exists notificationapi_connected boolean default false;

alter table public.athletes
  add column if not exists last_test_at timestamp with time zone,
  add column if not exists activity_status text default 'active',
  add column if not exists reports_sent_count int default 0;

alter table public.bookings
  add column if not exists sync_status text default 'synced',
  add column if not exists booking_source text,
  add column if not exists failure_reason text;