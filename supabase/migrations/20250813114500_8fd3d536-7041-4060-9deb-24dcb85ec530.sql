-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for exercise_videos
CREATE POLICY "Allow public read access to exercise_videos" 
ON public.exercise_videos 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to manage exercise_videos" 
ON public.exercise_videos 
FOR ALL 
TO authenticated
USING (true);

-- Create policies for test_videos  
CREATE POLICY "Allow public read access to test_videos" 
ON public.test_videos 
FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to manage test_videos" 
ON public.test_videos 
FOR ALL 
TO authenticated
USING (true);