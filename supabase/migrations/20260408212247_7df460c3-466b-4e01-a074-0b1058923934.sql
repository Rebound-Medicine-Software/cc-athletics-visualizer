
-- 1. ENABLE RLS ON PROFILES TABLE (critical - currently disabled!)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. FIX ATHLETES TABLE - Remove overly permissive public read policies
DROP POLICY IF EXISTS "Allow public read access to athletes" ON public.athletes;
DROP POLICY IF EXISTS "Allow public to read athletes by consent token" ON public.athletes;

-- Replace with a scoped anon policy: only allow reading a single row by consent_token
CREATE POLICY "Anon can read athlete by consent token"
ON public.athletes
FOR SELECT
TO anon
USING (consent_token IS NOT NULL AND consent_status = 'pending');

-- Authenticated org/super_admin can read all athletes
CREATE POLICY "Authenticated org admins can read athletes"
ON public.athletes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
  )
);

-- Fix overly permissive avatar update policy
DROP POLICY IF EXISTS "Allow authenticated users to update athlete avatars" ON public.athletes;

CREATE POLICY "Org admins can update athlete avatars"
ON public.athletes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);

-- 3. FIX PRACTITIONER ROLE ESCALATION - Create a trigger to prevent role changes
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If a user is updating their own profile and trying to change the role, block it
  IF OLD.user_id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
CREATE TRIGGER prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 4. MAKE ATHLETE-REPORTS BUCKET PRIVATE
UPDATE storage.buckets SET public = false WHERE id = 'athlete-reports';

-- Remove the public SELECT policy on athlete-reports
DROP POLICY IF EXISTS "Allow public access to athlete reports" ON storage.objects;

-- Add a scoped SELECT policy for authenticated team members
CREATE POLICY "Authenticated users can access their team reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-reports'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
  )
);

-- 5. TIGHTEN Elite Athlete Data write policies
DROP POLICY IF EXISTS "Allow authenticated users to delete elite athlete data" ON public."Elite Athlete Data";
DROP POLICY IF EXISTS "Allow authenticated users to insert elite athlete data" ON public."Elite Athlete Data";
DROP POLICY IF EXISTS "Allow authenticated users to update elite athlete data" ON public."Elite Athlete Data";

CREATE POLICY "Org admins can insert elite athlete data"
ON public."Elite Athlete Data"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);

CREATE POLICY "Org admins can update elite athlete data"
ON public."Elite Athlete Data"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);

CREATE POLICY "Org admins can delete elite athlete data"
ON public."Elite Athlete Data"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);

-- 6. TIGHTEN Region Testing write policies
DROP POLICY IF EXISTS "Allow authenticated users to delete region testing" ON public."Region Testing";
DROP POLICY IF EXISTS "Allow authenticated users to insert region testing" ON public."Region Testing";
DROP POLICY IF EXISTS "Allow authenticated users to update region testing" ON public."Region Testing";

CREATE POLICY "Org admins can insert region testing"
ON public."Region Testing"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);

CREATE POLICY "Org admins can update region testing"
ON public."Region Testing"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);

CREATE POLICY "Org admins can delete region testing"
ON public."Region Testing"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('organisation', 'super_admin')
  )
);
