-- Add missing font_family column to teams table
ALTER TABLE public.teams 
ADD COLUMN font_family text DEFAULT 'Inter';