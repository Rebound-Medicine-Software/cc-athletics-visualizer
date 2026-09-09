-- New VALD ForceDecks integration security follow-up (Section 9, flagged 25 August 2026, PR #42):
-- vald-bridge now requires an authenticated caller, but public.vald_profile_metadata itself
-- has no corresponding CREATE TABLE migration anywhere in this repo -- it was created directly
-- against the live database (outside GitHub), so its current RLS/policy state can't be confirmed
-- from git history the way every other table fix in this doc has been. This migration can only
-- make the table's access more restrictive, not less -- it does not know about, and cannot
-- remove, any other pre-existing policy that may exist under a different name.
--
-- What this table holds: sex/weight/height/position/sport/team/notes for every VALD athlete
-- across every clinic (src/components/settings/ValdAthleteMetadataSection.tsx), read and
-- written directly from the browser via supabase.from("vald_profile_metadata").select("*") /
-- .upsert(...) -- no team filter on the read, no role check in the frontend. Same shape as
-- elite_exercise_configs before PR #6: a shared, cross-clinic config table, edited from a
-- Settings tab with no frontend role gate.
--
-- Fix: enable RLS (safe no-op if already on) and add a staff-only manage policy using the
-- same get_my_role() helper and role set as PR #3/#6 (organisation, super_admin, practitioner).
-- Cross-team reads are left in, matching Section 3 Warning #5's "won't fix, by design" for
-- VALD/CC Athletics practitioner-side data -- this only blocks non-staff (e.g. athlete/client
-- logins) from reading or overwriting other clinics' athlete metadata; it doesn't add team
-- scoping on top of that.
--
-- NOT confirmed fully closed: because there is no prior migration for this table, there is no
-- way to check from GitHub alone whether some other, more permissive policy already exists
-- under a different name -- if so, it would still apply alongside this one (Postgres OR-combines
-- permissive policies). Needs Josh, or a future run with Supabase dashboard/Management API
-- access, to check Table Editor > vald_profile_metadata > RLS policies after this merges and
-- remove anything more permissive than the policy added here.

ALTER TABLE public.vald_profile_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.vald_profile_metadata;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.vald_profile_metadata;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.vald_profile_metadata;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.vald_profile_metadata;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON public.vald_profile_metadata;
DROP POLICY IF EXISTS "Staff can manage vald profile metadata" ON public.vald_profile_metadata;

CREATE POLICY "Staff can manage vald profile metadata"
ON public.vald_profile_metadata
FOR ALL
USING (public.get_my_role() IN ('organisation', 'super_admin', 'practitioner'))
WITH CHECK (public.get_my_role() IN ('organisation', 'super_admin', 'practitioner'));
