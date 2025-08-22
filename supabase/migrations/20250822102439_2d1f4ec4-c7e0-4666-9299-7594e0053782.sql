-- Fix RLS disabled issues by enabling RLS on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policy for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles  
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all profiles" ON public.user_profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);