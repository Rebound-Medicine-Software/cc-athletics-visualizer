-- Add missing columns to profiles and teams tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualifications text;

-- Update RLS policies for organization management
DROP POLICY IF EXISTS "Org can manage team staff" ON profiles;
DROP POLICY IF EXISTS "Clinicians edit self only" ON profiles;

CREATE POLICY "Organisations can manage their team members"
ON profiles
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'organisation'
    AND p.team_id = profiles.team_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'organisation'
    AND p.team_id = profiles.team_id
  )
);

CREATE POLICY "Practitioners can edit their own profile"
ON profiles
FOR UPDATE 
USING (user_id = auth.uid() AND role = 'practitioner')
WITH CHECK (user_id = auth.uid() AND role = 'practitioner');

CREATE POLICY "Practitioners can view their team members"
ON profiles
FOR SELECT
USING (
  team_id = (
    SELECT team_id FROM profiles 
    WHERE user_id = auth.uid()
  )
);