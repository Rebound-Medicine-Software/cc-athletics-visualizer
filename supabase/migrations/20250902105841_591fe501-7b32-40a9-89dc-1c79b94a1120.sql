-- Create a storage bucket for staff avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff-avatars', 'staff-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for staff avatars
CREATE POLICY "Public access to staff avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'staff-avatars');

CREATE POLICY "Authenticated users can upload staff avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'staff-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update staff avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'staff-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete staff avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'staff-avatars' AND auth.uid() IS NOT NULL);