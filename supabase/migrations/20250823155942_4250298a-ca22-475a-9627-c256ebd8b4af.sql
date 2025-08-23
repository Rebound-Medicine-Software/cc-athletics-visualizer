-- Fix security issues by enabling RLS on tables that have policies but RLS disabled

-- Check and enable RLS on user_profiles table if it exists and has policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;