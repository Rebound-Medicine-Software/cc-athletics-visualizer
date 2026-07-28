-- Security fix (framework.md Section 3, Critical #2): require authentication to read
-- athlete performance data.
--
-- public.test_data and public.elite_athlete_data both had SELECT policies created with
-- no "TO" clause (USING (true) only). In Postgres/PostgREST, a policy with no TO clause
-- applies to the PUBLIC role, which includes the anon (unauthenticated) API role. That
-- meant anyone with the project's public anon key -- no login required -- could read
-- every athlete's raw test results (test_data) and the elite athlete benchmark dataset
-- (elite_athlete_data), including athlete names.
--
-- This migration drops those two policies and recreates them scoped TO authenticated,
-- so a valid logged-in session is required to read either table. It does NOT yet scope
-- reads to a user's own team/org -- any authenticated user can still read any team's
-- data. That's a separate, already-tracked issue (framework.md Section 3, Warning #5)
-- and is intentionally left for a later pass so this change stays small and reviewable.
--
-- Not touched here (out of scope for this fix, noted for the record):
-- - public."Elite Athlete Data", public.elite_athlete_metrics, public.test_results,
--   public.athletes_new, public.clients were already moved to the `legacy` schema in
--   migration 20260428085938, which takes them out of PostgREST's default exposed
--   schema (typically just `public`). Worth a quick confirm in the Supabase dashboard's
--   API settings that `legacy` isn't also an exposed schema, but not re-fixed here.
-- - public.elite_exercise_configs (exercise config, not athlete performance data) and
--   public.athletes (has a deliberate anon consent-token read/update flow from
--   migration 20260408175310) were left alone as out of scope for this specific fix.

DROP POLICY IF EXISTS "Allow public read access to test_data" ON public.test_data;
CREATE POLICY "authenticated can read test_data"
ON public.test_data FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Public can read elite_athlete_data" ON public.elite_athlete_data;
CREATE POLICY "authenticated can read elite_athlete_data"
ON public.elite_athlete_data FOR SELECT
TO authenticated
USING (true);
