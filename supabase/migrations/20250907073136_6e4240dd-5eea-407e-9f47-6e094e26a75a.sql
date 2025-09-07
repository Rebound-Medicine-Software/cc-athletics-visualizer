-- Add password_hash column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'password_hash'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN password_hash text;
    END IF;
END $$;