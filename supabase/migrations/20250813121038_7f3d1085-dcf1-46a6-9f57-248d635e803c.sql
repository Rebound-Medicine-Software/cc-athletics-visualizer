-- Fix RLS policies for teams table
DROP POLICY IF EXISTS "Super admins can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Practitioners can view their own team" ON public.teams;
DROP POLICY IF EXISTS "Practitioners can update their own team" ON public.teams;

-- Create comprehensive RLS policies for teams
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

CREATE POLICY "Practitioners can insert teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (admin_id = auth.uid());

-- Fix function search path for security
CREATE OR REPLACE FUNCTION create_default_tiers_for_team()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only create tiers if none exist for this team
  IF NOT EXISTS (SELECT 1 FROM public.tiers WHERE team_id = NEW.id) THEN
    -- Create Basic tier
    INSERT INTO public.tiers (team_id, name, price_monthly, can_view_analytics, max_bookings_per_month)
    VALUES (NEW.id, 'Basic', 29.99, true, 4);
    
    -- Create Premium tier  
    INSERT INTO public.tiers (team_id, name, price_monthly, can_view_analytics, can_edit_programming, can_export_reports, max_bookings_per_month)
    VALUES (NEW.id, 'Premium', 59.99, true, true, true, 8);
    
    -- Create Elite tier
    INSERT INTO public.tiers (team_id, name, price_monthly, can_view_analytics, can_edit_programming, can_export_reports, can_adjust_sets_reps, max_bookings_per_month)
    VALUES (NEW.id, 'Elite', 99.99, true, true, true, true, 20);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix the existing handle_new_user function search path
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
  RETURN NEW;
END;
$$;