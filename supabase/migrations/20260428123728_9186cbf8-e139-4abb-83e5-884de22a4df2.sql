SELECT cron.unschedule('cleanup-stale-impersonations-15m')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-impersonations-15m');

SELECT cron.schedule(
  'cleanup-stale-impersonations-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/cleanup-stale-impersonations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDA4OTksImV4cCI6MjA2NDk3Njg5OX0.5_zOSAnBSxzg5zdcmTWjTjdbvScQ5VE_HKx0-PBCtc0"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);