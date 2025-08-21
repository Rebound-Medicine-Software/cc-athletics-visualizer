-- Drop ALL policies from ALL tables to avoid dependency issues
-- Teams table policies
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;
DROP POLICY IF EXISTS "Allow service role full access to teams" ON public.teams;
DROP POLICY IF EXISTS "Super admins can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Practitioners can insert teams" ON public.teams;
DROP POLICY IF EXISTS "Practitioners can update their own team" ON public.teams;
DROP POLICY IF EXISTS "Practitioners can view their own team" ON public.teams;

-- Tiers table policies
DROP POLICY IF EXISTS "Team members can view their team tiers" ON public.tiers;
DROP POLICY IF EXISTS "Practitioners can manage their team tiers" ON public.tiers;

-- Messages table policies
DROP POLICY IF EXISTS "Super admins can manage all messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages sent to or from them" ON public.messages;

-- Platform metrics policies
DROP POLICY IF EXISTS "Super admins can manage all platform metrics" ON public.platform_metrics;
DROP POLICY IF EXISTS "Practitioners can view their team metrics" ON public.platform_metrics;

-- Bookings table policies
DROP POLICY IF EXISTS "Super admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Practitioners can manage their team bookings" ON public.bookings;

-- Clients table policies  
DROP POLICY IF EXISTS "Super admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their own data" ON public.clients;
DROP POLICY IF EXISTS "Practitioners can manage their team clients" ON public.clients;

-- Add font_family column to teams table for branding
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';

-- Create user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'organisation', 'practitioner', 'client');
  END IF;
END $$;

-- Drop all role column references temporarily
ALTER TABLE public.profiles DROP DEFAULT FOR COLUMN role;

-- Update existing role values to match enum
UPDATE public.profiles 
SET role = CASE 
  WHEN role = 'staff' THEN 'practitioner'
  WHEN role IS NULL THEN 'client'
  ELSE role
END
WHERE role NOT IN ('super_admin', 'organisation', 'practitioner', 'client');

-- Now update the column type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role USING role::public.user_role;

-- Set the default back
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'client'::public.user_role;

-- Ensure team_id exists in profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'team_id') THEN
    ALTER TABLE public.profiles ADD COLUMN team_id uuid REFERENCES public.teams(id);
  END IF;
END $$;

-- Update teams table to ensure admin_id exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'teams' AND column_name = 'admin_id') THEN
    ALTER TABLE public.teams ADD COLUMN admin_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create function to apply team branding on login
CREATE OR REPLACE FUNCTION public.get_user_team_branding(user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'primary_color', COALESCE(t.primary_color, '#3B82F6'),
    'secondary_color', COALESCE(t.secondary_color, '#1E40AF'), 
    'accent_color', COALESCE(t.accent_color, '#F59E0B'),
    'font_family', COALESCE(t.font_family, 'Inter'),
    'logo_url', t.logo_url,
    'team_name', t.name
  )
  FROM public.profiles p
  LEFT JOIN public.teams t ON p.team_id = t.id
  WHERE p.user_id = get_user_team_branding.user_id;
$$;

-- Create function to check if user can manage team members
CREATE OR REPLACE FUNCTION public.can_manage_team_members(target_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.teams t ON p.team_id = t.id
    WHERE p.user_id = auth.uid() 
    AND (
      p.role = 'super_admin' 
      OR (p.role IN ('organisation', 'practitioner') AND (t.id = target_team_id OR t.admin_id = auth.uid()))
    )
  );
$$;

-- Update the handle_new_user trigger function to support organization setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client')
  );
  
  -- If the user is an organisation, create a team for them
  IF COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client') = 'organisation' THEN
    INSERT INTO public.teams (name, admin_id, cc_team_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'organization_name', 'New Organization'),
      NEW.id,
      NEW.id::text
    );
    
    -- Update the profile with the team_id
    UPDATE public.profiles 
    SET team_id = (SELECT id FROM public.teams WHERE admin_id = NEW.id LIMIT 1)
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;