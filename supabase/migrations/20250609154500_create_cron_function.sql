
-- Create function to setup daily sync cron job
CREATE OR REPLACE FUNCTION public.setup_daily_sync_cron()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule the daily sync job at 6:00 AM UTC
  PERFORM cron.schedule(
    'daily-cc-athletics-sync',
    '0 6 * * *',
    $$
    SELECT net.http_post(
      url := 'https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/sync-cc-athletics',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQwMDg5OSwiZXhwIjoyMDY0OTc2ODk5fQ.lUmOaWPl8xOYHn5p0Uh6eJHN8mF2RZSczV5J3uNhPRs"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    );
    $$
  );
  
  RETURN 'Daily sync cron job scheduled successfully at 6:00 AM UTC';
END;
$$;
