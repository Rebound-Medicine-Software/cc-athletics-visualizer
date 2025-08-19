-- Fix infinite recursion in RLS policies - complete reset with simpler approach
-- Drop ALL existing policies on profiles table to prevent any recursion
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Own profile access" ON public.profiles;
DROP POLICY IF EXISTS "Own profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Own profile update" ON public.profiles;
DROP POLICY IF EXISTS "Super admin view all" ON public.profiles;
DROP POLICY IF EXISTS "Organization view created" ON public.profiles;

-- Drop and recreate the function with simpler approach
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create a much simpler function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'client');
END;
$$;

-- Create completely simple policies without any recursion
-- Service role needs full access for edge functions
CREATE POLICY "Service role full access" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'service_role');

-- Users can view their own profile
CREATE POLICY "Own profile access"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own profile  
CREATE POLICY "Own profile insert"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Own profile update"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Super admins can view all profiles (using function to avoid recursion)
CREATE POLICY "Super admin view all"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'super_admin');

-- Organizations can view profiles they created (using function to avoid recursion)
CREATE POLICY "Organization view created"
ON public.profiles
FOR SELECT
USING (
  public.get_current_user_role() = 'organisation' 
  AND created_by IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);