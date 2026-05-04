-- Drop partial unique index in favor of a real named unique constraint
DROP INDEX IF EXISTS public.athletes_team_cc_athlete_uidx;

-- Add named unique constraint that PostgREST onConflict can target.
-- Postgres treats NULLs as distinct by default, so multiple rows with
-- null cc_athlete_id (manually created athletes) remain allowed.
ALTER TABLE public.athletes
  ADD CONSTRAINT athletes_team_cc_athlete_unique
  UNIQUE (team_id, cc_athlete_id);
