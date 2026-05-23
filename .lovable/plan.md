## Manual CSV Test Data Upload — Practitioner Workflow

A multi-step uploader for organisations/practitioners to import test CSVs into the existing `test_data` store, with file- and row-level duplicate detection against API-synced data.

### Database audit

Existing canonical store: `public.test_data` (jsonb `metrics`, `test_name`, `test_date`, `repetition_number`, `athlete_id`, `cc_athlete_id`, `team_name`). No `team_id`, no source/file metadata, no batch tracking. API sync writes here today.

### Schema changes (additive, non-breaking)

1. Extend `public.test_data`:
   - `team_id uuid` (nullable, indexed) — for tighter RLS on new rows
   - `test_subtype text` (e.g. CMJ/DJ/SJ/Pogos/GolfSwing/SitToStand)
   - `source text default 'api'` — `'api' | 'manual_csv'`
   - `import_batch_id uuid` (nullable, FK)
   - `file_hash text` (nullable, indexed)
   - `original_file_name text` (nullable)
   - `uploaded_by uuid` (nullable)
   - Partial unique index on `(athlete_id, test_name, test_date, repetition_number, file_hash)` where `source='manual_csv'` to prevent same-file double-insert.

2. New `public.csv_import_batches`:
   - id, team_id, athlete_id, uploaded_by, test_type, test_subtype, file_names text[], file_hashes text[], rows_parsed int, rows_imported int, rows_skipped int, duplicate_conflicts int, status text (`pending|completed|failed|partial`), notes text, created_at.
   - RLS: `can_access_team_row(team_id)`, plus service role + super admin policies.

3. New `public.csv_import_files`:
   - id, batch_id, file_name, file_size, file_last_modified, file_hash, rows_parsed, rows_imported, rows_skipped, status, error text.
   - Unique on `(team_id, athlete_id, test_type, file_hash)` (via batch join) — enforced application-side using a lookup query before insert; partial unique index on `(athlete_id, test_type, file_hash)` for hard guarantee.

### Upload flow (stepper)

`src/components/programming/csv-upload/` — new folder:

- `CsvUploadWizard.tsx` — 5-step stepper (Files → Test Type → Team/Athlete → Preview → Import).
- `StepFilesUpload.tsx` — drag/drop multi-file, shows name/size/status.
- `StepTestType.tsx` — cards for Movement (Golf Swing, Sit-to-stand), Balance, Jumps (CMJ/DJ/SJ/Pogos), Isometrics.
- `StepAssignTarget.tsx` — Team select → Athlete select (filtered).
- `StepPreview.tsx` — per-file preview: detected columns, parsed rows, detected date, duplicate file badge, duplicate-row count, importable/skipped breakdown, warnings, resolution choices (Skip / Import new only / Force).
- `StepImport.tsx` — progress + success summary linking to athlete profile.

Entry point: new tab "Manual Upload" inside Settings → Data Housing (`DataHousingTab`) or new sidebar item under Programming. (Proposed: extend `DataHousingTab` with a third tab "CSV Imports".)

### CSV parsing & mapping

`src/lib/csv/` (new):

- `parseCsv.ts` — uses `papaparse` (add dep) to read headers, trim, skip blank rows, normalize numeric values stripping units, parse dates across formats via `date-fns`.
- `mapMetrics.ts` — header→canonical mapping per test type, with fuzzy alias table (e.g. `jump height (cm)` → `jump_height`). Unmapped columns retained in `metrics._raw`.
- `fingerprintFile.ts` — SHA-256 of content (Web Crypto) + name+size+lastModified composite key.
- `detectDuplicates.ts` — for each parsed row, queries `test_data` filtered by `athlete_id + test_name + test_date + repetition_number`, then compares key metric values within tolerance (±1% default).

### Duplicate detection

A) File: hash lookup against `csv_import_files` filtered by `athlete_id + test_type`. If found → "Possible duplicate file" with Skip/Review/Force. Default = Skip.

B) Rows: compare against existing `test_data` (any source incl. API). Match criteria per test family documented in `detectDuplicates.ts`. Conflicts displayed in preview; user chooses Skip / Import only new / Review.

### Hooks & data layer

- `src/hooks/useCsvImport.ts` — orchestrates parse → fingerprint → duplicate check → insert batch + files + test_data rows in a single transaction (RPC) or chained inserts with rollback on failure.
- `src/hooks/useTeamAthletes.ts` — fetch athletes for selected team (reuse `useAthletes` filtered).

### RLS / security

- All new tables: team-scoped via `can_access_team_row(team_id)` (already standard pattern in project).
- `test_data` inserts require practitioner's profile.team_id to match selected team_id (validated client + RLS).
- Athletes only see their own imported rows via existing athlete-side test query (already filters by athlete_id).

### Files to be added

```text
src/components/programming/csv-upload/
  CsvUploadWizard.tsx
  StepFilesUpload.tsx
  StepTestType.tsx
  StepAssignTarget.tsx
  StepPreview.tsx
  StepImport.tsx
  types.ts
src/lib/csv/
  parseCsv.ts
  mapMetrics.ts
  fingerprintFile.ts
  detectDuplicates.ts
  testTypeConfig.ts
src/hooks/useCsvImport.ts
```

### Files to be modified

- `src/components/settings/DataHousingTab.tsx` — add "CSV Imports" tab mounting `CsvUploadWizard`.
- `package.json` — add `papaparse` + `@types/papaparse`.

### Migration

```sql
-- additive columns on test_data
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

-- batch + per-file tracking tables with RLS (team-scoped) — see full migration at apply time
```

### How to verify

1. Settings → Data Housing → CSV Imports.
2. Drop two CMJ CSV files, pick Jumps → CMJ, choose team + athlete, hit Next.
3. Preview shows parsed rows, no duplicates first time → Import → success summary.
4. Re-upload same file → "Possible duplicate file" banner, default Skip.
5. Upload a CSV whose rows match an API-synced row → "May already exist from API" banner with options.
6. Athlete logs in → new tests appear in Testing area alongside API ones.

### Limitations / out of scope

- No background processing — large files (>10k rows) parse in browser.
- Movement (Golf Swing / Sit-to-stand) metric mapping is permissive; unmapped columns stored under `metrics._raw`.
- No CSV column re-mapping UI in v1 (auto-mapping only).
- No edit/delete of imported batches in v1 (audit table only).
