-- Backfill profiles.full_name for client/athlete accounts created before
-- PR #27 (auto/2026-08-10-1146-fix-client-full-name-not-set).
--
-- send-client-credentials previously only ever put first_name/last_name in
-- the new auth user's metadata. handle_new_user() only reads
-- raw_user_meta_data.full_name / .name, so every client/athlete profile
-- created through that function was left with full_name = NULL, forever,
-- for any account created before PR #27 merges (PR #27 only fixes the
-- creation path going forward, it does not touch existing rows).
--
-- This silently broke the athlete-facing progress view (useAthleteProgress
-- in src/hooks/useHomeRoleData.ts), which falls back to matching test_data
-- by the profile's email when full_name is missing. test_data.athlete_name
-- always stores the athlete's real name (from the CC Athletics sync), never
-- an email address, so that lookup always returned zero rows -- every
-- affected athlete's own "my progress" screen showed 0 tests this month,
-- 0 last month, no recent tests, and their name displayed as their email.
--
-- Safe, one-time, idempotent backfill: only touches profiles where
-- full_name is currently NULL, joins to the linked athletes row via the
-- existing athletes.user_id -> profiles.user_id relationship (the same
-- link used by link_client_to_athlete / link_athlete_to_user), and only
-- writes a value when that linked athlete has a real, non-empty name.
-- Practitioner/staff profiles are untouched -- those are created via
-- send-clinician-credentials (which already sets full_name correctly) and
-- have no matching row in athletes, so the join simply excludes them.
UPDATE public.profiles p
SET full_name = a.name
FROM public.athletes a
WHERE a.user_id = p.user_id
  AND p.full_name IS NULL
  AND a.name IS NOT NULL
  AND btrim(a.name) <> '';
