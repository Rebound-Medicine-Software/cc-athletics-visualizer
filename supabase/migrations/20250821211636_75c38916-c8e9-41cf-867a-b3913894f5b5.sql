-- Add font_family column to teams table for branding
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';

-- Update profiles table to ensure proper role management
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'client';
  END IF;
END $$;

-- Create user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'organisation', 'practitioner', 'client');
  END IF;
END $$;

-- Update profiles table role column to use enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role USING role::public.user_role;

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

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Super admins can see all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'super_admin'
  )
);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Organization admins and practitioners can manage their team members
CREATE POLICY "Team managers can view team profiles"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles manager
    LEFT JOIN public.teams t ON manager.team_id = t.id
    WHERE manager.user_id = auth.uid()
    AND manager.role IN ('organisation', 'practitioner')
    AND (profiles.team_id = manager.team_id OR t.admin_id = auth.uid())
  )
);

-- Team managers can create new team members
CREATE POLICY "Team managers can create team profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.can_manage_team_members(team_id)
);

-- Team managers can update team member profiles
CREATE POLICY "Team managers can update team profiles"
ON public.profiles
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.can_manage_team_members(team_id)
);

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