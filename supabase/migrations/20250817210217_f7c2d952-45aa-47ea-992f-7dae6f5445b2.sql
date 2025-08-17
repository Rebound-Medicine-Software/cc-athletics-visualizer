-- Fix the RLS policy issue by dropping the problematic policy and creating proper ones
DROP POLICY IF EXISTS "Block access for orphaned accounts" ON public.profiles;

-- Update existing RLS policies to handle organization relationships better
-- This replaces the problematic policy with proper ones

-- Allow users to view their own profile and their organization's profiles
CREATE POLICY "Users can view related profiles"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid() OR -- Own profile
  (
    role IN ('practitioner', 'client') AND 
    created_by IN (
      SELECT id FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'organisation'
    )
  ) OR -- Profiles created by user's organization
  (
    role = 'organisation' AND 
    id IN (
      SELECT created_by FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  ) OR -- Organization that created the user
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) -- Super admin can see all
);

-- Fix the function search path issue
CREATE OR REPLACE FUNCTION public.cascade_delete_organization_dependents()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the deleted profile is an organization, delete all dependent profiles
  IF OLD.role = 'organisation' THEN
    -- Delete all clinicians and clients created by this organization
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