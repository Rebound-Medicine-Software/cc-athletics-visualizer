-- Drop redundant GLOBAL unique constraints on cc_athlete_id.
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS athletes_cc_athlete_id_key;
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS athletes_unique_key;

-- The above also drops their backing unique indexes. Belt-and-braces:
DROP INDEX IF EXISTS public.athletes_cc_athlete_id_key;
DROP INDEX IF EXISTS public.athletes_unique_key;

-- New uniqueness: scoped to (team_id, cc_athlete_id), ignoring NULL cc_athlete_id
-- (so manually created athletes without a CC id are unaffected) and NULL team_id.
CREATE UNIQUE INDEX IF NOT EXISTS athletes_team_cc_athlete_uidx
  ON public.athletes (team_id, cc_athlete_id)
  WHERE cc_athlete_id IS NOT NULL AND team_id IS NOT NULL;

-- Keep a non-unique lookup index on cc_athlete_id (already exists as idx_athletes_cc_athlete_id).
