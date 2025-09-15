-- Create storage bucket for athlete reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('athlete-reports', 'athlete-reports', true);

-- Create policies for athlete reports bucket
CREATE POLICY "Allow public access to athlete reports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'athlete-reports');

CREATE POLICY "Allow authenticated users to upload reports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'athlete-reports' AND auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage reports" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'athlete-reports' AND auth.role() = 'service_role');