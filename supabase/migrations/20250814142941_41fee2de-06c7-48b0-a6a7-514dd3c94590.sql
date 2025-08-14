-- Create super admin user
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'reflexsportstherapyy@gmail.com',
  now(),
  '{"role": "super_admin"}',
  now(),
  now()
) ON CONFLICT (email) DO NOTHING;

-- Create/update profile for super admin
INSERT INTO profiles (
  user_id,
  email,
  full_name,
  role
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'reflexsportstherapyy@gmail.com'),
  'reflexsportstherapyy@gmail.com',
  'Super Admin',
  'super_admin'
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'super_admin',
  updated_at = now();