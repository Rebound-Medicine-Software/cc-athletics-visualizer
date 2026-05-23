
-- 1) Extend test_data with manual-upload metadata
ALTER TABLE public.test_data
  ADD COLUMN IF NOT EXISTS team_id uuid,
  ADD COLUMN IF NOT EXISTS test_subtype text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS file_hash text,
  ADD COLUMN IF NOT EXISTS original_file_name text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid;

CREATE INDEX IF NOT EXISTS idx_test_data_team_id ON public.test_data(team_id);
CREATE INDEX IF NOT EXISTS idx_test_data_file_hash ON public.test_data(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_data_import_batch ON public.test_data(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- Prevent inserting the same physical row twice from the same CSV file
CREATE UNIQUE INDEX IF NOT EXISTS uq_test_data_manual_csv_row
  ON public.test_data(athlete_id, test_name, test_date, repetition_number, file_hash)
  WHERE source = 'manual_csv' AND file_hash IS NOT NULL;

-- 2) csv_import_batches
CREATE TABLE IF NOT EXISTS public.csv_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  uploaded_by uuid,
  test_type text NOT NULL,
  test_subtype text,
  file_names text[] NOT NULL DEFAULT '{}',
  file_hashes text[] NOT NULL DEFAULT '{}',
  rows_parsed integer NOT NULL DEFAULT 0,
  rows_imported integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  duplicate_conflicts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.csv_import_batches ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_csv_batches_team ON public.csv_import_batches(team_id);
CREATE INDEX IF NOT EXISTS idx_csv_batches_athlete ON public.csv_import_batches(athlete_id);

CREATE POLICY "service role csv_import_batches" ON public.csv_import_batches
  AS PERMISSIVE FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "super admins manage csv_import_batches" ON public.csv_import_batches
  AS PERMISSIVE FOR ALL TO public
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "team can manage csv_import_batches" ON public.csv_import_batches
  AS PERMISSIVE FOR ALL TO public
  USING (can_access_team_row(team_id)) WITH CHECK (can_access_team_row(team_id));

-- 3) csv_import_files
CREATE TABLE IF NOT EXISTS public.csv_import_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.csv_import_batches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  test_type text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  file_last_modified timestamptz,
  file_hash text NOT NULL,
  rows_parsed integer NOT NULL DEFAULT 0,
  rows_imported integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.csv_import_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_csv_files_batch ON public.csv_import_files(batch_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_team ON public.csv_import_files(team_id);

-- Hard guarantee: same file cannot be imported twice for the same athlete/test type
CREATE UNIQUE INDEX IF NOT EXISTS uq_csv_files_athlete_type_hash
  ON public.csv_import_files(athlete_id, test_type, file_hash);

CREATE POLICY "service role csv_import_files" ON public.csv_import_files
  AS PERMISSIVE FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "super admins manage csv_import_files" ON public.csv_import_files
  AS PERMISSIVE FOR ALL TO public
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "team can manage csv_import_files" ON public.csv_import_files
  AS PERMISSIVE FOR ALL TO public
  USING (can_access_team_row(team_id)) WITH CHECK (can_access_team_row(team_id));
