-- Enable RLS on tables that don't have it enabled
ALTER TABLE "Elite Athlete Data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Elite Athletes New" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Region Testing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE elite_athlete_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Add missing policies for tables with RLS enabled but no policies
CREATE POLICY "Allow public read access" ON "Elite Athletes New" FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON user_profiles FOR SELECT USING (true);