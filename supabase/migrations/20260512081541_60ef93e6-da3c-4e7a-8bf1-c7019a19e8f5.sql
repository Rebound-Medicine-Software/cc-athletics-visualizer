ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS sports text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sport_primary text;

CREATE INDEX IF NOT EXISTS idx_athletes_sports_gin ON public.athletes USING GIN (sports);
CREATE INDEX IF NOT EXISTS idx_athletes_team_sports ON public.athletes (team_id);