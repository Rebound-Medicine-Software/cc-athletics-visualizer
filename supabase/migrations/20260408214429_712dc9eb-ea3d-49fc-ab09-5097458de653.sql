
-- Helper: get current user's role without triggering RLS on profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: get current user's team_id without triggering RLS on profiles
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Organisations can manage their team members" ON public.profiles;
DROP POLICY IF EXISTS "Practitioners can view their team members" ON public.profiles;
DROP POLICY IF EXISTS "Practitioners can edit their own profile" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- Organisations can manage profiles in their team
CREATE POLICY "Organisations can manage team members"
ON public.profiles FOR ALL
USING (
  public.get_my_role() = 'organisation'
  AND team_id = public.get_my_team_id()
)
WITH CHECK (
  public.get_my_role() = 'organisation'
  AND team_id = public.get_my_team_id()
);

-- Practitioners can view their team members
CREATE POLICY "Practitioners can view team members"
ON public.profiles FOR SELECT
USING (team_id = public.get_my_team_id());

-- Practitioners can edit their own profile
CREATE POLICY "Practitioners can edit own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.get_my_role() = 'super_admin')
WITH CHECK (public.get_my_role() = 'super_admin');
