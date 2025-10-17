-- Create table to store elite exercise configurations
CREATE TABLE IF NOT EXISTS public.elite_exercise_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  metrics TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(test_name)
);

-- Enable RLS
ALTER TABLE public.elite_exercise_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for exercise configs
CREATE POLICY "Allow public read access to elite exercise configs"
ON public.elite_exercise_configs
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to manage elite exercise configs"
ON public.elite_exercise_configs
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add dynamic_metrics JSONB column to Elite Athlete Data table to store all metric values
ALTER TABLE public."Elite Athlete Data"
ADD COLUMN IF NOT EXISTS dynamic_metrics JSONB DEFAULT '{}'::jsonb;

-- Create trigger for updated_at
CREATE TRIGGER update_elite_exercise_configs_updated_at
BEFORE UPDATE ON public.elite_exercise_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();