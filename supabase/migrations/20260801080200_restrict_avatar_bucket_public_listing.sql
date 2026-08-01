-- Security fix: Warning #12 ("A storage bucket allows public listing")
--
-- The `athlete-avatars` and `staff-avatars` buckets had a SELECT policy on
-- storage.objects with no `TO` clause, which Postgres/PostgREST defaults to
-- the PUBLIC role (this includes `anon`, i.e. anyone with no login at all).
-- That means anyone could call Supabase Storage's list endpoint for these
-- buckets and enumerate every avatar filename, even without knowing a
-- specific file's path.
--
-- This does NOT affect how avatars are actually displayed in the app: both
-- buckets stay `public = true`, and the frontend only ever calls
-- `getPublicUrl()` (BrandingTab.tsx, AthleteCredentialsTab.tsx,
-- StaffCredentialsTab.tsx, RegionTestingTable.tsx) to fetch a known file by
-- its exact path. Direct downloads via that public URL bypass RLS entirely
-- for public buckets, so existing avatar images keep loading exactly as
-- before. No frontend code anywhere calls `.list()` on either bucket
-- (confirmed via repo search), so nothing relies on the open listing
-- behaviour being removed here.
--
-- Fix: scope both SELECT policies to `TO authenticated`, matching the
-- pattern already used for these buckets' UPDATE/DELETE policies (see the
-- 2026-07-30 migration for Warning #6).

DROP POLICY IF EXISTS "Public access to athlete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view athlete avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'athlete-avatars');

DROP POLICY IF EXISTS "Public access to staff avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view staff avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'staff-avatars');
