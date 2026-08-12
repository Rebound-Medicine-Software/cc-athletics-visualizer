-- Backfill profiles.full_name for existing organisation accounts.
--
-- Context: signup-organisation (the "Create Organisation Account" self-signup
-- edge function -- the actual account-creation path every new clinic owner
-- goes through) only ever put first_name/last_name/role in the new Supabase
-- Auth user's metadata, never full_name. The handle_new_user() trigger that
-- populates profiles only reads raw_user_meta_data.full_name / .name
-- (confirmed via the live trigger definition, migration 20250822115447), so
-- every organisation profile created via self-signup was left with
-- full_name = NULL, permanently, silently. PR #30 fixes the signup path
-- going forward, but does nothing for organisation accounts that already
-- exist -- this migration is the one-time backfill flagged in
-- framework.md Section 9 for those, same pattern as PR #28/#29's
-- client-account backfill.
--
-- Unlike client/athlete accounts, organisation accounts have no linked
-- athletes row to pull a name from -- the source data instead already
-- lives on the auth.users row itself, in the first_name/last_name fields
-- signup-organisation writes into raw_user_meta_data today (they were just
-- never combined into full_name for the profiles insert).
--
-- Safety:
-- * Only touches rows where full_name IS NULL today -- never overwrites a
--   name a user (or a prior fix) already set.
-- * Scoped to role = 'organisation' -- doesn't touch practitioner or
--   client/athlete rows, which have their own creation paths / backfills
--   (PR #27 and PR #28/#29).
-- * Only sets it where the linked auth.users row actually has a non-empty
--   first_name and/or last_name in its metadata.
-- * Pure UPDATE, no schema change, no RLS/policy change.

UPDATE public.profiles p
SET full_name = btrim(concat_ws(' ',
    u.raw_user_meta_data ->> 'first_name',
    u.raw_user_meta_data ->> 'last_name'
  ))
FROM auth.users u
WHERE u.id = p.user_id
  AND p.role = 'organisation'
  AND p.full_name IS NULL
  AND btrim(concat_ws(' ',
      u.raw_user_meta_data ->> 'first_name',
      u.raw_user_meta_data ->> 'last_name'
    )) <> '';
