-- Add branding columns to teams table
ALTER TABLE public.teams 
ADD COLUMN font_family text DEFAULT 'Inter',
ADD COLUMN primary_color text DEFAULT '#000000',
ADD COLUMN secondary_color text DEFAULT '#FFFFFF', 
ADD COLUMN accent_color text DEFAULT '#FF0000';