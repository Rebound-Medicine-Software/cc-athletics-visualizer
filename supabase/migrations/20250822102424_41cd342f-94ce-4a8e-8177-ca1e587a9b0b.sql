-- Add role and qualifications columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_title text,
ADD COLUMN IF NOT EXISTS qualifications text;