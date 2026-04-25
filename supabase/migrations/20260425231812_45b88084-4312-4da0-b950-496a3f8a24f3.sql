-- ============================================
-- MIGRATION 05 — RLS POLICY MODERNISATION
-- Replace team-based checks with can_access_team_row()
-- ============================================

-- ===== ATHLETES =====
drop policy if exists "Allow organisation admins to manage athletes" on public.athletes;
drop policy if exists "Authenticated org admins can read athletes" on public.athletes;
drop policy if exists "Org admins can update athlete avatars" on public.athletes;
drop policy if exists "team can view athletes" on public.athletes;
drop policy if exists "team can manage athletes" on public.athletes;

create policy "team can view athletes"
on public.athletes
for select
using (public.can_access_team_row(team_id));

create policy "team can manage athletes"
on public.athletes
for all
using (public.can_access_team_row(team_id))
with check (public.can_access_team_row(team_id));

-- ===== BOOKINGS =====
drop policy if exists "Practitioners can manage their team bookings" on public.bookings;
drop policy if exists "Super admins can manage all bookings" on public.bookings;
drop policy if exists "team can manage bookings" on public.bookings;

create policy "team can manage bookings"
on public.bookings
for all
using (public.can_access_team_row(team_id))
with check (public.can_access_team_row(team_id));

-- ===== BOOKING NOTES =====
drop policy if exists "Team members can view booking notes" on public.booking_notes;
drop policy if exists "Team practitioners can insert booking notes" on public.booking_notes;
drop policy if exists "Team practitioners can update booking notes" on public.booking_notes;
drop policy if exists "Team practitioners can delete booking notes" on public.booking_notes;
drop policy if exists "team can manage booking_notes" on public.booking_notes;

create policy "team can manage booking_notes"
on public.booking_notes
for all
using (public.can_access_team_row(team_id))
with check (public.can_access_team_row(team_id));

-- ===== PLATFORM METRICS =====
drop policy if exists "Practitioners can view their team metrics" on public.platform_metrics;
drop policy if exists "Super admins can manage all platform metrics" on public.platform_metrics;
drop policy if exists "team can view platform_metrics" on public.platform_metrics;
drop policy if exists "super admins manage platform_metrics" on public.platform_metrics;

create policy "team can view platform_metrics"
on public.platform_metrics
for select
using (public.can_access_team_row(team_id));

create policy "super admins manage platform_metrics"
on public.platform_metrics
for all
using (public.is_super_admin())
with check (public.is_super_admin());

-- ===== TIERS =====
drop policy if exists "Practitioners can manage their team tiers" on public.tiers;
drop policy if exists "Team members can view their team tiers" on public.tiers;
drop policy if exists "team can view tiers" on public.tiers;
drop policy if exists "team admins manage tiers" on public.tiers;

create policy "team can view tiers"
on public.tiers
for select
using (public.can_access_team_row(team_id));

create policy "team admins manage tiers"
on public.tiers
for all
using (
  public.can_access_team_row(team_id)
  and (public.get_my_role() in ('organisation','super_admin'))
)
with check (
  public.can_access_team_row(team_id)
  and (public.get_my_role() in ('organisation','super_admin'))
);

-- ===== LOGIN EVENTS =====
drop policy if exists "Team members view team login events" on public.login_events;
drop policy if exists "team can view login_events" on public.login_events;

create policy "team can view login_events"
on public.login_events
for select
using (public.can_access_team_row(team_id));

-- ===== SOCIAL ENGAGEMENT SNAPSHOTS =====
drop policy if exists "Team members view team social snapshots" on public.social_engagement_snapshots;
drop policy if exists "team can view social_snapshots" on public.social_engagement_snapshots;

create policy "team can view social_snapshots"
on public.social_engagement_snapshots
for select
using (public.can_access_team_row(team_id));
