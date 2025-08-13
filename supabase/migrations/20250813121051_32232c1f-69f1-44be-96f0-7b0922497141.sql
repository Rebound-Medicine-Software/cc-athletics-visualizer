-- Check which tables need RLS policies by querying the specific table mentioned in the error
-- Add missing policies for any tables that need them

-- Fix the remaining function search path issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;