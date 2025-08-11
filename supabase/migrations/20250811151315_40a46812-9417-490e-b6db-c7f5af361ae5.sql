-- Create Elite Athlete Data table
CREATE TABLE public."Elite Athlete Data" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "Team Name" TEXT NOT NULL,
  "Athlete Name" TEXT NOT NULL,
  "Sex" TEXT NOT NULL,
  "Sport" TEXT NOT NULL,
  "Age Group" INTEGER NOT NULL,
  "Weight Category (kg)" TEXT NOT NULL,
  "CMJ Jump Height (cm)" NUMERIC,
  "CMJ Peak Power (W)" INTEGER,
  "CMJ Relative Peak Power (W/kg)" INTEGER,
  "CMJ Reactive Strength Index" TEXT,
  "IMTP Peak Force (N)" INTEGER,
  "IMTP Relative Peak Force (N/kg)" NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public."Elite Athlete Data" ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to elite athlete data" 
ON public."Elite Athlete Data" 
FOR SELECT 
USING (true);

-- Insert the provided data
INSERT INTO public."Elite Athlete Data" (
  "Team Name", 
  "Athlete Name", 
  "Sex", 
  "Sport", 
  "Age Group", 
  "Weight Category (kg)", 
  "CMJ Jump Height (cm)", 
  "CMJ Peak Power (W)", 
  "CMJ Relative Peak Power (W/kg)", 
  "CMJ Reactive Strength Index", 
  "IMTP Peak Force (N)", 
  "IMTP Relative Peak Force (N/kg)"
) VALUES
  ('UFC', 'UFC', 'male', 'MMA', 34, 'Heavyweight (94kg - 120kg)', 45, 5490, 47, NULL, 3418, 2.95),
  ('UFC', 'UFC', 'male', 'MMA', 33, 'Light Heavyweight (85kg - 93kg)', 53, 5981, 56, NULL, 3560, 3.56),
  ('UFC', 'UFC', 'male', 'MMA', 34, 'Middleweight (78kg - 84kg)', 48.6, 5072, 51, NULL, 3288, 3.44),
  ('UFC', 'UFC', 'male', 'MMA', 32, 'Welterweight (71kg - 77kg)', 48.6, 4583, 50, NULL, 2985, 3.36),
  ('UFC', 'UFC', 'male', 'MMA', 30, 'Lightweight (66kg - 70kg)', 47.1, 4218, 50, NULL, 2789, 3.38),
  ('UFC', 'UFC', 'male', 'MMA', 30, 'Featherweight (62kg - 66kg)', 50, 4136, 53, NULL, 2691, 3.47),
  ('UFC', 'UFC', 'male', 'MMA', 30, 'Bantamweight (56kg - 61kg)', 47.2, 3854, 52, NULL, 2549, 3.51),
  ('UFC', 'UFC', 'male', 'MMA', 29, 'Flyweight (~ 56kg)', 44.8, 3501, 47, NULL, 2199, 3.29),
  ('UFC', 'UFC', 'female', 'MMA', 32, 'Female Featherweight (62kg - 66kg)', 44.6, 4120, NULL, NULL, 1773, NULL),
  ('UFC', 'UFC', 'female', 'MMA', 31, 'Female Bantamweight (56kg - 61kg)', 38.5, 3134, 40, NULL, 1841, 2.58),
  ('UFC', 'UFC', 'female', 'MMA', 30, 'Female Flyweight (52kg - 56kg)', 36.5, 2819, 40, NULL, 1929, 2.89),
  ('UFC', 'UFC', 'female', 'MMA', 29, 'Female Strawweight (~ 52kg)', 39.4, 2797, 45, NULL, 1740, 2.89);