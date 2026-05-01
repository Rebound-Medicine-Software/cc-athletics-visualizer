-- 1. Add can_use_ai_coach permission to tiers
ALTER TABLE public.tiers
ADD COLUMN IF NOT EXISTS can_use_ai_coach boolean NOT NULL DEFAULT false;

-- Auto-upgrade: tiers that already have report export get AI coach by default
UPDATE public.tiers
SET can_use_ai_coach = true
WHERE can_export_reports = true AND can_use_ai_coach = false;

-- 2. Create AI coach insight cache table
CREATE TABLE IF NOT EXISTS public.ai_coach_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  athlete_id uuid,
  test_name text NOT NULL,
  test_date date,
  source_metrics_hash text NOT NULL,
  insight jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_insights_lookup
  ON public.ai_coach_insights (team_id, athlete_id, test_name, source_metrics_hash);

CREATE INDEX IF NOT EXISTS idx_ai_coach_insights_team_created
  ON public.ai_coach_insights (team_id, created_at DESC);

ALTER TABLE public.ai_coach_insights ENABLE ROW LEVEL SECURITY;

-- Practitioners: read own team
CREATE POLICY "team can view ai_coach_insights"
  ON public.ai_coach_insights
  FOR SELECT
  USING (can_access_team_row(team_id));

-- Practitioners: insert for own team
CREATE POLICY "team can insert ai_coach_insights"
  ON public.ai_coach_insights
  FOR INSERT
  WITH CHECK (can_access_team_row(team_id));

-- Service role: full access for edge functions
CREATE POLICY "service role ai_coach_insights"
  ON public.ai_coach_insights
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Super admins: full access
CREATE POLICY "super admins manage ai_coach_insights"
  ON public.ai_coach_insights
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());