-- Security fix (Section 3, Warning #6): any authenticated user, regardless of
-- role or team, could overwrite or delete ANY athlete's or staff member's
-- avatar file in the athlete-avatars / staff-avatars storage buckets.
--
-- The original UPDATE and DELETE policies (2025-09-02 migrations) only
-- checked bucket_id = '...' AND auth.uid() IS NOT NULL -- i.e. any logged-in
-- account, including a newly-signed-up one with no assigned role, could
-- replace or remove any other user's profile picture. This is the same
-- shape of bug already fixed on the athlete-reports bucket (PR #3) -- this
-- migration applies the same fix (scoping to organisation/super_admin/
-- practitioner roles via profiles.role) to the two avatar buckets.
--
-- No frontend code lets an athlete or staff member touch their own avatar
-- directly -- avatar upload/replace happens from practitioner- and
-- org-admin-facing settings screens (BrandingTab.tsx,
-- AthleteCredentialsTab.tsx, RegionTestingTable.tsx, StaffCredentialsTab.tsx),
-- all already gated behind practitioner/org-admin UI. This change makes the
-- database enforce what the UI already assumes, closing the same
-- direct-storage-API bypass path that PR #3 closed for uploads.

-- athlete-avatars bucket
DROP POLICY IF EXISTS "Authenticated users can update athlete avatars" ON storage.objects;
CREATE POLICY "Org admins and practitioners can update athlete avatars"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'athlete-avatars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete athlete avatars" ON storage.objects;
CREATE POLICY "Org admins and practitioners can delete athlete avatars"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'athlete-avatars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
    )
  );

-- staff-avatars bucket
DROP POLICY IF EXISTS "Authenticated users can update staff avatars" ON storage.objects;
CREATE POLICY "Org admins and practitioners can update staff avatars"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'staff-avatars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete staff avatars" ON storage.objects;
CREATE POLICY "Org admins and practitioners can delete staff avatars"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'staff-avatars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('organisation', 'super_admin', 'practitioner')
    )
  );
