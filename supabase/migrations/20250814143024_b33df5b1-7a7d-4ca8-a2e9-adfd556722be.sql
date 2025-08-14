-- Create/update profile for super admin using email lookup
-- First, let's check if user exists and create profile
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Try to find existing user by email from auth.users (if accessible)
    -- Since we can't directly INSERT into auth.users, we'll create the profile
    -- and the user will be created when they sign up
    
    -- For now, create a placeholder profile that will be updated when user signs up
    INSERT INTO profiles (
        user_id,
        email, 
        full_name,
        role
    ) VALUES (
        gen_random_uuid(), -- temporary UUID, will be updated by trigger
        'reflexsportstherapyy@gmail.com',
        'Super Admin',
        'super_admin'
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'super_admin',
        full_name = 'Super Admin',
        updated_at = now();
END $$;