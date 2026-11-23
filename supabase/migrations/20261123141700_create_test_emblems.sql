-- Storage bucket for athlete-facing test emblem images, uploaded by practitioners
-- from Settings -> Data & Content -> Test Emblems, one per test_name. Follows the
-- same public image-bucket pattern already used for athlete-avatars / staff-avatars.
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-emblems', 'test-emblems', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access to test emblems"
ON storage.objects
FOR SELECT
USING (bucket_id = 'test-emblems');

CREATE POLICY "Authenticated users can upload test emblems"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'test-emblems' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update test emblems"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'test-emblems' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete test emblems"
ON storage.objects
FOR DELETE
USING (bucket_id = 'test-emblems' AND auth.uid() IS NOT NULL);

-- Maps a specific test_name (the exact string stored in test_data.test_name, e.g.
-- "Gastroc Isometric Test", "Countermovement Jump", "Coppenhagen Side Lying Adductor
-- Test") to an uploaded emblem image, per team. One row per team + test_name.
-- Deliberately keyed to the real test_name string rather than the CSV-upload
-- TestType/TestSubtype taxonomy in testTypeConfig.ts, since API-synced tests (CC
-- Athletics / VALD) carry test names that taxonomy doesn't cover at all.
-- No row for a given test_name = no emblem assigned yet; the force plate report
-- leaves that emblem slot blank rather than falling back to a placeholder.
CREATE TABLE public.test_emblems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, test_name)
);

CREATE INDEX idx_test_emblems_team ON public.test_emblems(team_id);

ALTER TABLE public.test_emblems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team can view test_emblems"
ON public.test_emblems FOR SELECT
USING (can_access_team_row(team_id));

CREATE POLICY "team can insert test_emblems"
ON public.test_emblems FOR INSERT
WITH CHECK (can_access_team_row(team_id));

CREATE POLICY "team can update test_emblems"
ON public.test_emblems FOR UPDATE
USING (can_access_team_row(team_id))
WITH CHECK (can_access_team_row(team_id));

CREATE POLICY "team can delete test_emblems"
ON public.test_emblems FOR DELETE
USING (can_access_team_row(team_id));

-- generate-force-plate-report runs under the service role, same as the other
-- report-generation functions, so it needs its own bypass to read emblem rows.
CREATE POLICY "service role test_emblems"
ON public.test_emblems FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_test_emblems_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_test_emblems_updated_at
  BEFORE UPDATE ON public.test_emblems
  FOR EACH ROW EXECUTE FUNCTION public.set_test_emblems_updated_at();
