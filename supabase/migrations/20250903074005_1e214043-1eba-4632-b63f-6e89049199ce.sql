-- Add password field to athletes table
ALTER TABLE public.athletes 
ADD COLUMN password_hash text;

-- Create index for better performance
CREATE INDEX idx_athletes_password ON public.athletes(id) WHERE password_hash IS NOT NULL;