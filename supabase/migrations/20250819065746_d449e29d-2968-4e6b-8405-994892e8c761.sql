-- Completely eliminate recursive policies by removing them entirely
-- Drop ALL policies that could cause recursion
DROP POLICY IF EXISTS "Super admin view all" ON public.profiles;
DROP POLICY IF EXISTS "Organization view created" ON public.profiles;

-- Drop the function that's causing recursion
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create only the essential non-recursive policies
-- Service role access (needed for edge functions)
-- Users accessing their own profile
-- These policies are guaranteed to not cause recursion

-- The only policies we'll keep are completely safe ones:
-- 1. Service role has full access (for backend operations)
-- 2. Users can access their own profile (no external references)
-- 3. Users can insert/update their own profile (no external references)

-- Note: Super admins and organizations will need to be handled differently
-- without RLS policies that could cause recursion