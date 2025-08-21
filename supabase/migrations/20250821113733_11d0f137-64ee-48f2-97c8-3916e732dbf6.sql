-- Add setup_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN setup_completed boolean DEFAULT false;