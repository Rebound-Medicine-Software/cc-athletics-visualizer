
-- Allow team members and super admins to write to test_data (manual CSV imports etc.)
CREATE POLICY "team can insert test_data"
  ON public.test_data FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IS NOT NULL AND public.can_access_team_row(team_id)
  );

CREATE POLICY "team can update test_data"
  ON public.test_data FOR UPDATE
  TO authenticated
  USING (team_id IS NOT NULL AND public.can_access_team_row(team_id))
  WITH CHECK (team_id IS NOT NULL AND public.can_access_team_row(team_id));

CREATE POLICY "team can delete test_data"
  ON public.test_data FOR DELETE
  TO authenticated
  USING (team_id IS NOT NULL AND public.can_access_team_row(team_id));

CREATE POLICY "super admins manage test_data"
  ON public.test_data FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
