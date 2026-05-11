ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS retest_interval_days integer NOT NULL DEFAULT 42;

UPDATE public.teams SET retest_interval_days = 42 WHERE retest_interval_days IS NULL;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_retest_interval_days_range;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_retest_interval_days_range
  CHECK (retest_interval_days BETWEEN 7 AND 365);