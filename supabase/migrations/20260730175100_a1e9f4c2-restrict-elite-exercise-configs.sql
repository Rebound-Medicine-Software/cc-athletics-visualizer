-- Warning #6 (Section 3) continued: this closes a second gap in "any authenticated
-- user can update or delete any other user's records" -- the avatar-bucket half was
-- fixed in PR #5, this is the elite_exercise_configs table.
--
-- public.elite_exercise_configs had a single "FOR ALL USING (auth.uid() IS NOT NULL)"
-- policy (added 2025-10-17) covering INSERT/UPDATE/DELETE (and, redundantly, SELECT).
-- Unlike athletes/bookings/etc, this table has NO team_id column at all -- it's a
-- platform-wide list of elite benchmark test definitions (test_name + metrics) that
-- every clinic's Elite Comparison feature reads from (EliteComparisonFilters.tsx,
-- LiveDataSection.tsx) and that gets edited from Settings > Data Housing
-- (EliteAthleteDataTable.tsx). That settings screen has no role check in the
-- frontend either (src/pages/Settings.tsx just switches on a tab id), so before this
-- fix any logged-in account of any role, at any clinic, could rename, retarget, or
-- delete the benchmark definitions every other clinic's comparisons depend on.
--
-- Fix: replace the blanket policy with one scoped to staff roles (organisation,
-- super_admin, practitioner) via the existing get_my_role() SECURITY DEFINER helper
-- (same helper + same role set used for the athlete-reports bucket fix in PR #3).
-- Public SELECT is untouched -- it's a separate, already-existing policy ("Allow
-- public read access to elite exercise configs") and reading test names/metric
-- lists isn't sensitive, so it's left as-is.

DROP POLICY IF EXISTS "Allow authenticated users to manage elite exercise configs" ON public.elite_exercise_configs;

CREATE POLICY "Staff can manage elite exercise configs"
ON public.elite_exercise_configs
FOR ALL
USING (public.get_my_role() IN ('organisation', 'super_admin', 'practitioner'))
WITH CHECK (public.get_my_role() IN ('organisation', 'super_admin', 'practitioner'));
