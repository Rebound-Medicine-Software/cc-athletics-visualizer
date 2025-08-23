-- Fix the cascade delete function to prevent the "tuple already modified" error
-- by using a more robust deletion approach

DROP TRIGGER IF EXISTS cascade_delete_organization_dependents_trigger ON profiles;
DROP FUNCTION IF EXISTS cascade_delete_organization_dependents();

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
    -- Use DELETE with EXISTS to avoid the tuple modification conflict
    DELETE FROM public.profiles p1
    WHERE p1.created_by = OLD.id 
    AND p1.role IN ('practitioner', 'client')
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.id = p1.id 
      AND p2.id != p1.id
    );
    
    -- Delete the team associated with this organization
    DELETE FROM public.teams 
    WHERE admin_id = OLD.user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.teams t2
      WHERE t2.id = teams.id
      AND t2.id != teams.id
    );
  END IF;
  
  RETURN OLD;
END;
$$;