-- Add font_family column to teams table for complete branding support
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';

-- Update existing teams to have default font
UPDATE public.teams 
SET font_family = 'Inter' 
WHERE font_family IS NULL;