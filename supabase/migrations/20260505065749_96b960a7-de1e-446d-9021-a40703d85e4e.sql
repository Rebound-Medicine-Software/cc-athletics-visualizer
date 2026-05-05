
CREATE POLICY "Practitioners can view child workspace teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  parent_team_id IS NOT NULL
  AND parent_team_id IN (SELECT public.get_my_workspace_team_ids())
);
