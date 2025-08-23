-- Fix the cascade delete function to prevent the "tuple already modified" error
-- by using a more robust deletion approach

-- Drop the trigger and function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS cascade_delete_organization_dependents() CASCADE;

-- Create a safer cascade delete function that handles the deletion properly
CREATE OR REPLACE FUNCTION public.safe_cascade_delete_organization_dependents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the deleted profile is an organization, delete all dependent profiles
  IF OLD.role = 'organisation' THEN
    -- Use a simpler approach to avoid the tuple modification conflict
    DELETE FROM public.profiles 
    WHERE created_by = OLD.id 
    AND role IN ('practitioner', 'client');
    
    -- Delete the team associated with this organization
    DELETE FROM public.teams 
    WHERE admin_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create the trigger with the new function
CREATE TRIGGER safe_cascade_delete_organization_dependents_trigger
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_cascade_delete_organization_dependents();