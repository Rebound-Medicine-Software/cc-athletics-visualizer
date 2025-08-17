-- Fix the infinite recursion in RLS policies
-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;

-- Recreate simpler, non-recursive policies
-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Organizations can view profiles they created
CREATE POLICY "Organizations can view created profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles org
    WHERE org.user_id = auth.uid() 
    AND org.role = 'organisation'
    AND profiles.created_by = org.id
  )
);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);