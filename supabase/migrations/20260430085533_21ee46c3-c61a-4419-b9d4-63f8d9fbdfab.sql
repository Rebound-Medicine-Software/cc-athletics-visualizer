-- Phase H23: Enable realtime for Control Centre operational tables
-- Add tables to the supabase_realtime publication so Super Admin pages
-- (LiveMonitor, Compliance) can subscribe to inserts in real time.
-- RLS still applies on the client subscription — only super_admin can read these rows.

ALTER TABLE public.test_data REPLICA IDENTITY FULL;
ALTER TABLE public.platform_activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.integration_health_logs REPLICA IDENTITY FULL;
ALTER TABLE public.super_admin_impersonation_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'test_data'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.test_data';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'platform_activity_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_activity_logs';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'integration_health_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_health_logs';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'super_admin_impersonation_logs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.super_admin_impersonation_logs';
  END IF;
END $$;