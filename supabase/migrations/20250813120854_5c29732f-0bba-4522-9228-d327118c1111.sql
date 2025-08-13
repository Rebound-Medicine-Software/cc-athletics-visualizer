-- Create role enum
CREATE TYPE public.user_role AS ENUM ('super_admin', 'practitioner', 'client');

-- Create teams table for clinic/organization management
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF', 
  accent_color TEXT DEFAULT '#F59E0B',
  address TEXT,
  region TEXT,
  country TEXT DEFAULT 'UK',
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tiers table for pricing/feature management
CREATE TABLE public.tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  can_view_analytics BOOLEAN DEFAULT false,
  can_edit_programming BOOLEAN DEFAULT false,
  can_export_reports BOOLEAN DEFAULT false,
  can_adjust_sets_reps BOOLEAN DEFAULT false,
  max_bookings_per_month INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update profiles table to include role and team information
ALTER TABLE public.profiles ADD COLUMN role public.user_role DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN tier_id UUID REFERENCES public.tiers(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';

-- Enable RLS on new tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams
CREATE POLICY "Super admins can manage all teams" 
ON public.teams 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Practitioners can view their own team" 
ON public.teams 
FOR SELECT 
USING (
  admin_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.team_id = teams.id
  )
);

CREATE POLICY "Practitioners can update their own team" 
ON public.teams 
FOR UPDATE 
USING (admin_id = auth.uid());

-- RLS policies for tiers
CREATE POLICY "Team members can view their team tiers" 
ON public.tiers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (
      profiles.team_id = tiers.team_id OR 
      profiles.role = 'super_admin'
    )
  )
);

CREATE POLICY "Practitioners can manage their team tiers" 
ON public.tiers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = tiers.team_id 
    AND teams.admin_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = tiers.team_id 
    AND teams.admin_id = auth.uid()
  )
);

-- Update profiles RLS policies for new role system
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

CREATE POLICY "Practitioners can view their team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = profiles.team_id 
    AND teams.admin_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Practitioners can update their team profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = profiles.team_id 
    AND teams.admin_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create default tiers for teams
CREATE OR REPLACE FUNCTION create_default_tiers_for_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Basic tier
  INSERT INTO public.tiers (team_id, name, price_monthly, can_view_analytics, max_bookings_per_month)
  VALUES (NEW.id, 'Basic', 29.99, true, 4);
  
  -- Create Premium tier  
  INSERT INTO public.tiers (team_id, name, price_monthly, can_view_analytics, can_edit_programming, can_export_reports, max_bookings_per_month)
  VALUES (NEW.id, 'Premium', 59.99, true, true, true, 8);
  
  -- Create Elite tier
  INSERT INTO public.tiers (team_id, name, price_monthly, can_view_analytics, can_edit_programming, can_export_reports, can_adjust_sets_reps, max_bookings_per_month)
  VALUES (NEW.id, 'Elite', 99.99, true, true, true, true, 20);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default tiers when a team is created
CREATE TRIGGER create_default_tiers_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION create_default_tiers_for_team();

-- Update the handle_new_user function to set role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
  RETURN NEW;
END;
$$;