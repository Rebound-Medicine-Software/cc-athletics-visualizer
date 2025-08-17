-- Add created_by column to profiles table for tracking organization relationships
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create trigger to cascade delete dependent profiles when organization is deleted
CREATE OR REPLACE FUNCTION public.cascade_delete_organization_dependents()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for cascade deletion
DROP TRIGGER IF EXISTS on_organization_profile_deleted ON public.profiles;
CREATE TRIGGER on_organization_profile_deleted
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_organization_dependents();

-- Update RLS policies to prevent access when organization is deleted
CREATE POLICY "Block access for orphaned accounts" 
ON public.profiles 
FOR ALL 
USING (
  CASE 
    WHEN role IN ('practitioner', 'client') THEN 
      -- Check if their creating organization still exists
      EXISTS (
        SELECT 1 FROM public.profiles org 
        WHERE org.id = profiles.created_by 
        AND org.role = 'organisation'
      )
    ELSE true -- Super admins and organizations can always access
  END
);