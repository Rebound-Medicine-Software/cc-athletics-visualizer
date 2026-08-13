-- Critical security fix #3: any authenticated user (regardless of role) could
-- upload files into the athlete-reports storage bucket.
--
-- The original INSERT policy created 2025-09-15 ("Allow authenticated users to
-- upload reports") only checked auth.role() = 'authenticated' with no
-- ownership/team/role scoping, so any logged-in account -- including a
-- newly-signed-up one with no assigned role -- could write arbitrary files
-- into this bucket. A later migration (2026-04-08) tightened the SELECT
-- policy on this same bucket to require an organisation/super_admin/
-- practitioner role, but left this INSERT policy untouched.
--
-- Report-generation edge functions (generate-athlete-report,
-- generate-force-plate-report, generate-interactive-pdf-report,
-- generate-sample-interactive-report) all write to this bucket using the
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely -- so this change
-- does not affect them. No frontend code writes to this bucket directly.

DROP POLICY IF EXISTS "Allow authenticated users to upload reports" ON storage.objects;

CREATE POLICY "Org admins and practitioners can upload reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'athlete-reports'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
    )
  );
