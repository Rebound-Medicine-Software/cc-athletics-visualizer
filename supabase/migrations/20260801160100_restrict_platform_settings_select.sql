-- Security fix: Warning #13 (Lovable scan) — "An RLS policy evaluates to always-true"
--
-- public.platform_settings had a SELECT policy ("authenticated can read
-- platform_settings", added 2026-04-28) with `USING (true)` and no role/team
-- scoping — any logged-in user (practitioner, athlete, or patient account)
-- could read the entire table directly (GET /platform_settings?select=*),
-- bypassing the super-admin-only checks built into the RPCs this table is
-- meant to be accessed through (get_platform_settings, list_feature_flags,
-- get_default_branding_settings, etc. — all SECURITY DEFINER, all gated on
-- is_super_admin()).
--
-- Confirmed safe to drop entirely, not just narrow: a full repo search found
-- no frontend code calling `.from('platform_settings')` directly — every
-- read and write goes through the SECURITY DEFINER RPCs above, which run
-- with elevated privileges and are unaffected by this policy change.
-- The "service role platform_settings" and "super admins manage
-- platform_settings" policies already cover all legitimate direct access.

DROP POLICY IF EXISTS "authenticated can read platform_settings" ON public.platform_settings;
