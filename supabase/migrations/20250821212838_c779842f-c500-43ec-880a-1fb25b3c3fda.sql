-- Create a new enum type with the corrected values
CREATE TYPE public.user_role_new AS ENUM ('super_admin', 'organisation', 'practitioner', 'client');

-- Add font_family column to teams table for branding
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter';

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

-- Add a new column with the correct enum type
ALTER TABLE public.profiles ADD COLUMN role_new public.user_role_new DEFAULT 'client';

-- Update the new column with corrected values
UPDATE public.profiles 
SET role_new = CASE 
  WHEN role = 'staff' THEN 'practitioner'::public.user_role_new
  WHEN role = 'super_admin' THEN 'super_admin'::public.user_role_new
  WHEN role = 'organisation' THEN 'organisation'::public.user_role_new
  WHEN role = 'practitioner' THEN 'practitioner'::public.user_role_new
  WHEN role = 'client' THEN 'client'::public.user_role_new
  ELSE 'client'::public.user_role_new
END;

-- Drop the old column and rename the new one
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

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
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role_new, 'client')
  );
  
  -- If the user is an organisation, create a team for them
  IF COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role_new, 'client') = 'organisation' THEN
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