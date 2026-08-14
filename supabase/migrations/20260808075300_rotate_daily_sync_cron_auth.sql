-- SECURITY FIX (2026-08-08 scheduled run): the original daily-cc-athletics-sync
-- cron job (see 20250609154500_create_cron_function.sql) was scheduled with the
-- Supabase SERVICE ROLE key hardcoded in its Authorization header. That key
-- bypasses Row Level Security entirely (unlike the anon/publishable key, which
-- is safe to expose by design) and it has been sitting in plaintext in this
-- repo's migration history -- which is public -- since June 2025.
-- This migration re-points the LIVE scheduled cron job at the public anon key
-- instead, matching the exact pattern already used safely by every other
-- pg_cron -> edge function job in this repo (see the two migrations dated
-- 2026-04-28). The anon key is only needed here to satisfy sync-cc-athletics'
-- verify_jwt gate (it is not in config.toml's verify_jwt = false list, so it
-- defaults to requiring *a* valid JWT). The function itself never reads this
-- header for its actual database writes -- it already builds its own
-- privileged client internally from the SUPABASE_SERVICE_ROLE_KEY
-- *environment variable* (see supabase/functions/sync-cc-athletics/index.ts),
-- which is managed by Supabase and never touches git. So this swap changes
-- zero privileges and zero behaviour for the sync job itself.
-- IMPORTANT: this migration only fixes the live cron job's auth header.
-- It does NOT remove the leaked key from git history, and a git commit can
-- never fully undo a public exposure. The service_role key itself must be
-- rotated in the Supabase dashboard (Project Settings > API) as soon as
-- possible -- see this run's summary for detail. That step can only be done
-- by Josh (or a future run with dashboard/Management API access), not via a
-- GitHub commit.
DO $$
BEGIN
  PERFORM cron.unschedule('daily-cc-athletics-sync');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'daily-cc-athletics-sync',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/sync-cc-athletics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDA4OTksImV4cCI6MjA2NDk3Njg5OX0.5_zOSAnBSxzg5zdcmTWjTjdbvScQ5VE_HKx0-PBCtc0"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);
