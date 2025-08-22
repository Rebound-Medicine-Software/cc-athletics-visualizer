-- Add missing fields to profiles table for staff credentials mapping
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_title text,
ADD COLUMN IF NOT EXISTS qualifications text;

-- Update the handle_new_user function to include the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, role, role_title, qualifications)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'),
    NEW.raw_user_meta_data ->> 'role_title',
    NEW.raw_user_meta_data ->> 'qualifications'
  );
  RETURN NEW;
END;
$$;