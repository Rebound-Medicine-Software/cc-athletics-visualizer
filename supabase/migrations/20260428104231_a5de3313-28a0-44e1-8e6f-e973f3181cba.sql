-- Partial unique index to prevent duplicate unresolved alerts
CREATE UNIQUE INDEX IF NOT EXISTS platform_alerts_unique_unresolved
  ON public.platform_alerts (alert_type, COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE is_resolved = false;