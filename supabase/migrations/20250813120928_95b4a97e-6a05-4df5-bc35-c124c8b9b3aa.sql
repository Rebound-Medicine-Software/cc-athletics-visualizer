-- Create role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'practitioner', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to existing teams table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='logo_url') THEN
        ALTER TABLE public.teams ADD COLUMN logo_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='primary_color') THEN
        ALTER TABLE public.teams ADD COLUMN primary_color TEXT DEFAULT '#3B82F6';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='secondary_color') THEN
        ALTER TABLE public.teams ADD COLUMN secondary_color TEXT DEFAULT '#1E40AF';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='accent_color') THEN
        ALTER TABLE public.teams ADD COLUMN accent_color TEXT DEFAULT '#F59E0B';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='admin_id') THEN
        ALTER TABLE public.teams ADD COLUMN admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='stripe_account_id') THEN
        ALTER TABLE public.teams ADD COLUMN stripe_account_id TEXT;
    END IF;
END $$;

-- Create tiers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tiers (
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

-- Add new columns to existing profiles table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role public.user_role DEFAULT 'client';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='team_id') THEN
        ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tier_id') THEN
        ALTER TABLE public.profiles ADD COLUMN tier_id UUID REFERENCES public.tiers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_customer_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_subscription_id') THEN
        ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_status') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
    END IF;
END $$;

-- Enable RLS on tiers table
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Team members can view their team tiers" ON public.tiers;
DROP POLICY IF EXISTS "Practitioners can manage their team tiers" ON public.tiers;

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
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = tiers.team_id 
    AND teams.admin_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Create default tiers function
CREATE OR REPLACE FUNCTION create_default_tiers_for_team()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS create_default_tiers_trigger ON public.teams;
CREATE TRIGGER create_default_tiers_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION create_default_tiers_for_team();