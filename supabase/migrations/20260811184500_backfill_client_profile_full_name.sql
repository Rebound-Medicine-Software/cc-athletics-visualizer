-- Backfill profiles.full_name for existing client/athlete accounts.
--
-- Context: send-client-credentials (the edge function that creates every
-- client/athlete login) only ever put first_name/last_name in the new
-- Supabase Auth user's metadata. The handle_new_user() trigger that
-- populates profiles only reads raw_user_meta_data.full_name / .name, so
-- every client/athlete profile created through that path was left with
-- full_name = NULL. PR #27 fixes the account-creation path going forward,
-- but does nothing for accounts that already exist -- this migration is
-- the one-time backfill flagged in framework.md Section 9 for those.
--
-- Effect: useAthleteProgress (src/hooks/useHomeRoleData.ts) computes
-- candidateName = profile.full_name || profile.email and matches it
-- against test_data.athlete_name (which always stores real names, never
-- emails). With full_name NULL, that lookup always returned zero rows,
-- so affected athletes saw an empty "my progress" screen. Setting
-- full_name from the linked athletes row fixes the lookup for anyone
-- this backfill can safely match.
--
-- Safety:
--   * Only touches rows where full_name IS NULL today -- never
--     overwrites a name a user (or a prior fix) already set.
--   * Only sets it where a linked athletes row exists via the existing
--     athletes.user_id -> profiles.user_id relationship (the same link
--     used by link_client_to_athlete / the 2026-05-11 backfill), and
--     only when that athletes row actually has a name.
--   * Pure UPDATE, no schema change, no RLS/policy change.

UPDATE public.profiles p
SET full_name = a.name
FROM public.athletes a
WHERE a.user_id = p.user_id
  AND p.full_name IS NULL
  AND a.name IS NOT NULL;
