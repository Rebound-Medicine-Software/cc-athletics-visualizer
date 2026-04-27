
-- 1. Canonical snake_case elite athlete benchmark table
CREATE TABLE IF NOT EXISTS public.elite_athlete_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  athlete_name TEXT NOT NULL,
  sex TEXT,
  sport TEXT,
  age_group INTEGER,
  weight_category TEXT,
  cmj_jump_height_cm NUMERIC,
  cmj_peak_power_w NUMERIC,
  cmj_relative_peak_power_w_per_kg NUMERIC,
  cmj_reactive_strength_index TEXT,
  imtp_peak_force_n NUMERIC,
  imtp_relative_peak_force_n_per_kg NUMERIC,
  dynamic_metrics JSONB DEFAULT '{}'::jsonb,
  test_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Duplicate prevention (expression unique index, NULL-safe)
CREATE UNIQUE INDEX IF NOT EXISTS elite_athlete_data_unique_idx
  ON public.elite_athlete_data (
    team_name,
    athlete_name,
    COALESCE(sport, ''),
    COALESCE(age_group, 0),
    COALESCE(weight_category, '')
  );

-- 3. updated_at trigger
DROP TRIGGER IF EXISTS set_elite_athlete_data_updated_at ON public.elite_athlete_data;
CREATE TRIGGER set_elite_athlete_data_updated_at
BEFORE UPDATE ON public.elite_athlete_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Migrate from "Elite Athlete Data" (wide format) — preserve IDs
INSERT INTO public.elite_athlete_data (
  id, team_name, athlete_name, sex, sport, age_group, weight_category,
  cmj_jump_height_cm, cmj_peak_power_w, cmj_relative_peak_power_w_per_kg,
  cmj_reactive_strength_index, imtp_peak_force_n, imtp_relative_peak_force_n_per_kg,
  dynamic_metrics, created_at
)
SELECT
  src.id,
  src."Team Name",
  src."Athlete Name",
  src."Sex",
  src."Sport",
  src."Age Group",
  src."Weight Category (kg)",
  src."CMJ Jump Height (cm)"::numeric,
  src."CMJ Peak Power (W)"::numeric,
  src."CMJ Relative Peak Power (W/kg)"::numeric,
  src."CMJ Reactive Strength Index",
  src."IMTP Peak Force (N)"::numeric,
  src."IMTP Relative Peak Force (N/kg)"::numeric,
  COALESCE(src.dynamic_metrics, '{}'::jsonb),
  COALESCE(src.created_at, now())
FROM public."Elite Athlete Data" src
WHERE NOT EXISTS (
  SELECT 1 FROM public.elite_athlete_data dst
  WHERE dst.team_name = src."Team Name"
    AND dst.athlete_name = src."Athlete Name"
    AND COALESCE(dst.sport, '') = COALESCE(src."Sport", '')
    AND COALESCE(dst.age_group, 0) = COALESCE(src."Age Group", 0)
    AND COALESCE(dst.weight_category, '') = COALESCE(src."Weight Category (kg)", '')
);

-- 5. Migrate from elite_athlete_metrics (long EAV → wide)
INSERT INTO public.elite_athlete_data (
  team_name, athlete_name, sex, sport, age_group, weight_category,
  cmj_jump_height_cm, cmj_peak_power_w, cmj_relative_peak_power_w_per_kg,
  cmj_reactive_strength_index, imtp_peak_force_n, imtp_relative_peak_force_n_per_kg,
  test_date, created_at
)
SELECT
  pivoted.team_name,
  pivoted.athlete_name,
  pivoted.sex,
  pivoted.sport,
  pivoted.age_group,
  pivoted.weight_category,
  pivoted.cmj_jump_height_cm,
  pivoted.cmj_peak_power_w,
  pivoted.cmj_relative_peak_power_w_per_kg,
  pivoted.cmj_reactive_strength_index,
  pivoted.imtp_peak_force_n,
  pivoted.imtp_relative_peak_force_n_per_kg,
  pivoted.test_date,
  pivoted.created_at
FROM (
  SELECT
    team_name,
    athlete_name,
    MAX(sex)   AS sex,
    MAX(sport) AS sport,
    NULLIF(regexp_replace(MAX(age_group), '\D', '', 'g'), '')::integer AS age_group,
    MAX(weight_category_kg::text) AS weight_category,
    MAX(metric_value) FILTER (WHERE exercise = 'CMJ'  AND metric_type = 'Jump Height (cm)')             AS cmj_jump_height_cm,
    MAX(metric_value) FILTER (WHERE exercise = 'CMJ'  AND metric_type = 'Peak Power (W)')               AS cmj_peak_power_w,
    MAX(metric_value) FILTER (WHERE exercise = 'CMJ'  AND metric_type = 'Relative Peak Power (W/kg)')   AS cmj_relative_peak_power_w_per_kg,
    MAX(metric_value::text) FILTER (WHERE exercise = 'CMJ' AND metric_type = 'Reactive Strength Index') AS cmj_reactive_strength_index,
    MAX(metric_value) FILTER (WHERE exercise = 'IMTP' AND metric_type = 'Peak Force (N)')               AS imtp_peak_force_n,
    MAX(metric_value) FILTER (WHERE exercise = 'IMTP' AND metric_type = 'Relative Peak Force (N/kg)')   AS imtp_relative_peak_force_n_per_kg,
    MAX(test_date)  AS test_date,
    MIN(created_at) AS created_at
  FROM public.elite_athlete_metrics
  GROUP BY team_name, athlete_name, sport, age_group, weight_category_kg
) pivoted
WHERE NOT EXISTS (
  SELECT 1 FROM public.elite_athlete_data dst
  WHERE dst.team_name = pivoted.team_name
    AND dst.athlete_name = pivoted.athlete_name
    AND COALESCE(dst.sport, '') = COALESCE(pivoted.sport, '')
    AND COALESCE(dst.age_group, 0) = COALESCE(pivoted.age_group, 0)
    AND COALESCE(dst.weight_category, '') = COALESCE(pivoted.weight_category, '')
);

-- 6. RLS
ALTER TABLE public.elite_athlete_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read elite_athlete_data" ON public.elite_athlete_data;
CREATE POLICY "Public can read elite_athlete_data"
ON public.elite_athlete_data
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role full access elite_athlete_data" ON public.elite_athlete_data;
CREATE POLICY "Service role full access elite_athlete_data"
ON public.elite_athlete_data
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Org admins can insert elite_athlete_data" ON public.elite_athlete_data;
CREATE POLICY "Org admins can insert elite_athlete_data"
ON public.elite_athlete_data
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation','super_admin')
));

DROP POLICY IF EXISTS "Org admins can update elite_athlete_data" ON public.elite_athlete_data;
CREATE POLICY "Org admins can update elite_athlete_data"
ON public.elite_athlete_data
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation','super_admin')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation','super_admin')
));

DROP POLICY IF EXISTS "Org admins can delete elite_athlete_data" ON public.elite_athlete_data;
CREATE POLICY "Org admins can delete elite_athlete_data"
ON public.elite_athlete_data
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation','super_admin')
));
