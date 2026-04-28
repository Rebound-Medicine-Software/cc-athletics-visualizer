CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop pre-existing schedules with the same names so re-running is safe.
DO $$
BEGIN
  PERFORM cron.unschedule('generate-platform-alerts-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('compute-org-health-snapshots-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'generate-platform-alerts-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/generate-platform-alerts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDA4OTksImV4cCI6MjA2NDk3Njg5OX0.5_zOSAnBSxzg5zdcmTWjTjdbvScQ5VE_HKx0-PBCtc0"}'::jsonb,
    body := jsonb_build_object('trigger','cron','at',now())
  );
  $$
);

SELECT cron.schedule(
  'compute-org-health-snapshots-daily',
  '15 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/compute-org-health-snapshots',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDA4OTksImV4cCI6MjA2NDk3Njg5OX0.5_zOSAnBSxzg5zdcmTWjTjdbvScQ5VE_HKx0-PBCtc0"}'::jsonb,
    body := jsonb_build_object('trigger','cron','at',now())
  );
  $$
);