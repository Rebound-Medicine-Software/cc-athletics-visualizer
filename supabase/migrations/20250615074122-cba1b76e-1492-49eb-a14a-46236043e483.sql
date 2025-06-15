
-- Create a normalized table for elite force plate athlete metrics
CREATE TABLE public.elite_athlete_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  athlete_name TEXT NOT NULL,
  sex TEXT,
  sport TEXT,
  age_group TEXT,
  weight_category_kg NUMERIC,
  exercise TEXT NOT NULL,           -- e.g., 'CMJ', 'IMTP'
  metric_type TEXT NOT NULL,         -- e.g., 'Jump Height (cm)', 'Peak Power (W)'
  metric_value NUMERIC NOT NULL,     -- stores the actual metric number
  test_date DATE,                    -- optional: add if you want test session date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for data security (can adjust policy after app logic added)
ALTER TABLE public.elite_athlete_metrics ENABLE ROW LEVEL SECURITY;

-- For now (public apps), allow read-only SELECT for everyone
CREATE POLICY "Allow public read access" ON public.elite_athlete_metrics
  FOR SELECT USING (true);
