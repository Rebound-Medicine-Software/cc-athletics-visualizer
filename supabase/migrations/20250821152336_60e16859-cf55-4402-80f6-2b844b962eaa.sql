-- Add api_key column to teams table to store CC Athletics API key
ALTER TABLE public.teams 
ADD COLUMN api_key TEXT;

-- Add practitioner_count and setup_data columns to teams table
ALTER TABLE public.teams 
ADD COLUMN practitioner_count INTEGER DEFAULT 0,
ADD COLUMN setup_data JSONB DEFAULT '{}'::jsonb;

-- Add api_key column to profiles table as backup storage
ALTER TABLE public.profiles 
ADD COLUMN api_key TEXT;