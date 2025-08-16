-- Create super admin profile for reflexsportstherapyy@gmail.com
INSERT INTO public.profiles (
  user_id, 
  email, 
  full_name, 
  role
) VALUES (
  'bc807a37-b8e6-42b4-9411-bb020299061a',
  'reflexsportstherapyy@gmail.com',
  'Joshua Richards-Fisher',
  'super_admin'
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;