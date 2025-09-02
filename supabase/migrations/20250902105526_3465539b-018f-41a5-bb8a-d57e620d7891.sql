-- Add avatar_url column to athletes table
ALTER TABLE public.athletes 
ADD COLUMN avatar_url TEXT;

-- Create a storage bucket for athlete avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('athlete-avatars', 'athlete-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for athlete avatars
CREATE POLICY "Public access to athlete avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'athlete-avatars');

CREATE POLICY "Authenticated users can upload athlete avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'athlete-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update athlete avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'athlete-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete athlete avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'athlete-avatars' AND auth.uid() IS NOT NULL);