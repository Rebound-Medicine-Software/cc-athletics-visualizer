
-- In-app notifications delivered by platform campaigns
CREATE TABLE public.platform_in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.platform_notification_campaigns(id) ON DELETE CASCADE,
  team_id uuid,
  recipient_user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz
);

CREATE INDEX idx_in_app_notif_recipient ON public.platform_in_app_notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_in_app_notif_campaign ON public.platform_in_app_notifications(campaign_id);

ALTER TABLE public.platform_in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role in_app_notifications"
  ON public.platform_in_app_notifications FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "super admins manage in_app_notifications"
  ON public.platform_in_app_notifications FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Recipients can read own in_app_notifications"
  ON public.platform_in_app_notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Recipients can update own in_app_notifications"
  ON public.platform_in_app_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Webhook endpoint configuration
CREATE TABLE public.platform_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid,
  label text NOT NULL,
  url text NOT NULL,
  secret text,
  is_active boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_webhook_endpoints_team ON public.platform_webhook_endpoints(team_id);

ALTER TABLE public.platform_webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role webhook_endpoints"
  ON public.platform_webhook_endpoints FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "super admins manage webhook_endpoints"
  ON public.platform_webhook_endpoints FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Helper RPC: count active webhook endpoints (safe summary, no secrets)
CREATE OR REPLACE FUNCTION public.count_active_webhook_endpoints()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.platform_webhook_endpoints WHERE is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.count_active_webhook_endpoints() TO authenticated;
