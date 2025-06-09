
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cc_team_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  creation_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create athletes table
CREATE TABLE public.athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cc_athlete_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  cc_team_id TEXT,
  gender TEXT,
  age INTEGER,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_data table for all force plate metrics
CREATE TABLE public.test_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES public.athletes(id),
  cc_athlete_id TEXT NOT NULL,
  athlete_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  test_name TEXT NOT NULL,
  repetition_number INTEGER NOT NULL,
  metrics JSONB NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('jump', 'isometric', 'pogo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_athletes_cc_athlete_id ON public.athletes(cc_athlete_id);
CREATE INDEX idx_teams_cc_team_id ON public.teams(cc_team_id);
CREATE INDEX idx_test_data_athlete_id ON public.test_data(athlete_id);
CREATE INDEX idx_test_data_test_date ON public.test_data(test_date);
CREATE INDEX idx_test_data_test_type ON public.test_data(test_type);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access to teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access to athletes" ON public.athletes FOR SELECT USING (true);
CREATE POLICY "Allow public read access to test_data" ON public.test_data FOR SELECT USING (true);

-- Create policies for service role access (for edge functions)
CREATE POLICY "Allow service role full access to teams" ON public.teams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to athletes" ON public.athletes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access to test_data" ON public.test_data FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON public.athletes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_data_updated_at BEFORE UPDATE ON public.test_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
