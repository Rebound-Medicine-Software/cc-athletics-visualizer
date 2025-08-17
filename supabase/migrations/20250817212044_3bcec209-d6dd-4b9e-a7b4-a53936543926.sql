-- Let's completely reset the RLS policies for profiles to eliminate recursion
-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Organizations can view created profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view related profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;

-- Create a security definer function to get current user role safely
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'client');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create simple, non-recursive policies
-- Allow service role full access (needed for edge functions)
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