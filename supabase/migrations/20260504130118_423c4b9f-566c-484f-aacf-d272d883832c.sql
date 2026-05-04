-- Add explicit INSERT policy for athletes scoped via can_access_team_row
-- (The existing "team can manage athletes" ALL policy already covers INSERT,
--  but adding an explicit, narrowly-named INSERT policy makes intent clear and
--  hardens against accidental policy regressions.)
DROP POLICY IF EXISTS "team can insert athletes" ON public.athletes;

CREATE POLICY "team can insert athletes"
ON public.athletes
FOR INSERT
TO authenticated
WITH CHECK (can_access_team_row(team_id));