
-- Create table for exercise videos/demonstrations
CREATE TABLE public.exercise_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL UNIQUE,
  video_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add location/geographic data to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UK',
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add location data to test_data table for regional analysis
ALTER TABLE public.test_data 
ADD COLUMN IF NOT EXISTS test_location TEXT,
ADD COLUMN IF NOT EXISTS test_city TEXT,
ADD COLUMN IF NOT EXISTS test_region TEXT;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE TRIGGER update_exercise_videos_updated_at
  BEFORE UPDATE ON public.exercise_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample exercise videos for common tests
INSERT INTO public.exercise_videos (test_name, video_url, description) VALUES
('Countermovement Jump', 'https://example.com/cmj-demo.mp4', 'Demonstration of proper countermovement jump technique'),
('Drop Jump', 'https://example.com/dj-demo.mp4', 'Demonstration of proper drop jump technique'),
('Squat Jump', 'https://example.com/sj-demo.mp4', 'Demonstration of proper squat jump technique'),
('Pogo Jump', 'https://example.com/pogo-demo.mp4', 'Demonstration of proper pogo jump technique'),
('Isometric Test', 'https://example.com/iso-demo.mp4', 'Demonstration of isometric testing procedure')
ON CONFLICT (test_name) DO NOTHING;
