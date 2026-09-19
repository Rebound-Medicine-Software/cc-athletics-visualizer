-- Moves the pg_cron-triggered stale-impersonation cleanup out of the
-- cleanup-stale-impersonations edge function and into a SECURITY DEFINER
-- Postgres function, called directly by pg_cron.
--
-- Why: the edge function had no auth check of its own, relying entirely on
-- Supabase's platform-level "some validly-signed JWT" requirement, which the
-- public anon key satisfies with no login. It can't check for a real user
-- either, because the pg_cron job itself calls the function's HTTP endpoint
-- with the anon key as its bearer token (see the 2026-04-28 migration that
-- scheduled it) - there is no way to tell a legitimate cron request apart
-- from a public anon-key request at the HTTP layer. Rather than inventing a
-- new shared secret (the same anti-pattern already flagged elsewhere in this
-- codebase as a live secret-leak risk when hardcoded into a migration), the
-- cron path is moved to run entirely inside Postgres - no HTTP hop, no
-- bearer token, nothing for an anon-key holder to call. The edge function
-- now only serves the manual "Close stale (>8h)" button in the Control
-- Centre's Impersonation Audit panel, gated by a real is_super_admin() check.

CREATE OR REPLACE FUNCTION public.cleanup_stale_impersonations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed integer;
BEGIN
  UPDATE public.super_admin_impersonation_logs
  SET ended_at = started_at + interval '8 hours',
      reason = trim(concat(coalesce(reason, ''), ' [auto-closed: stale > 8h]'))
  WHERE ended_at IS NULL
    AND started_at < (now() - interval '8 hours');

  GET DIAGNOSTICS v_closed = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'closed', v_closed);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_impersonations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_stale_impersonations() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_impersonations() TO service_role;

-- Re-point the existing 15-minute cron job at the new function directly,
-- instead of an HTTP call to the edge function with the anon key.
SELECT cron.unschedule('cleanup-stale-impersonations-15m')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-impersonations-15m');

SELECT cron.schedule(
    'cleanup-stale-impersonations-15m',
    '*/15 * * * *',
    $$SELECT public.cleanup_stale_impersonations();$$
);
