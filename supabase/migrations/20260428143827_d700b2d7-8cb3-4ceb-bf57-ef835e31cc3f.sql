-- =========================================================
-- Phase H9: Notification Campaigns
-- =========================================================

CREATE TABLE IF NOT EXISTS public.platform_notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  title text NOT NULL,
  message text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',          -- all | tier | organisation | status | churn_risk
  target_value text,                                 -- tier name, team uuid, status string, or numeric threshold
  delivery_channel text NOT NULL DEFAULT 'email',    -- email | in_app | webhook
  status text NOT NULL DEFAULT 'draft',              -- draft | queued | sending | sent | failed
  recipient_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  error_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz,
  sent_at timestamptz
);

ALTER TABLE public.platform_notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admins manage notification_campaigns" ON public.platform_notification_campaigns;
CREATE POLICY "super admins manage notification_campaigns"
  ON public.platform_notification_campaigns
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "service role notification_campaigns" ON public.platform_notification_campaigns;
CREATE POLICY "service role notification_campaigns"
  ON public.platform_notification_campaigns
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_pnc_status_created ON public.platform_notification_campaigns(status, created_at DESC);

-- =========================================================
-- Audience resolver (shared helper)
-- =========================================================
CREATE OR REPLACE FUNCTION public.preview_notification_audience(
  p_target_type text,
  p_target_value text DEFAULT NULL
)
RETURNS TABLE(team_id uuid, organisation_name text, owner_email text, tier_name text, subscription_status text, churn_risk_score numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold numeric;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    p.email,
    ti.name,
    t.subscription_status,
    coalesce(t.churn_risk_score, 0)::numeric
  FROM public.teams t
  LEFT JOIN public.tiers ti ON ti.id = t.tier_id
  LEFT JOIN public.profiles p ON p.user_id = t.admin_id
  WHERE
    CASE
      WHEN p_target_type = 'all' THEN true
      WHEN p_target_type = 'tier' THEN lower(coalesce(ti.name,'')) = lower(coalesce(p_target_value,''))
      WHEN p_target_type = 'organisation' THEN t.id::text = p_target_value
      WHEN p_target_type = 'status' THEN coalesce(t.subscription_status,'') = coalesce(p_target_value,'')
      WHEN p_target_type = 'churn_risk' THEN coalesce(t.churn_risk_score,0) >= COALESCE(NULLIF(p_target_value,'')::numeric, 60)
      ELSE false
    END;
END;
$$;

-- =========================================================
-- list_notification_campaigns
-- =========================================================
CREATE OR REPLACE FUNCTION public.list_notification_campaigns()
RETURNS TABLE(
  id uuid,
  title text,
  message text,
  target_type text,
  target_value text,
  delivery_channel text,
  status text,
  recipient_count integer,
  delivered_count integer,
  failed_count integer,
  created_by uuid,
  created_by_email text,
  created_at timestamptz,
  queued_at timestamptz,
  sent_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.title, c.message, c.target_type, c.target_value,
    c.delivery_channel, c.status,
    c.recipient_count, c.delivered_count, c.failed_count,
    c.created_by,
    coalesce(
      (SELECT email FROM public.super_admin_users s WHERE s.auth_user_id = c.created_by LIMIT 1),
      (SELECT email FROM public.profiles p WHERE p.user_id = c.created_by LIMIT 1)
    ) AS created_by_email,
    c.created_at, c.queued_at, c.sent_at
  FROM public.platform_notification_campaigns c
  ORDER BY c.created_at DESC;
END;
$$;

-- =========================================================
-- get_notification_campaign_detail
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_notification_campaign_detail(campaign_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_notification_campaigns;
  v_audience json;
  v_result json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT * INTO v_row FROM public.platform_notification_campaigns WHERE id = campaign_uuid;
  IF v_row.id IS NULL THEN RETURN NULL; END IF;

  SELECT coalesce(json_agg(row_to_json(a)), '[]'::json) INTO v_audience FROM (
    SELECT * FROM public.preview_notification_audience(v_row.target_type, v_row.target_value) LIMIT 200
  ) a;

  SELECT json_build_object(
    'campaign', row_to_json(v_row),
    'audience_preview', v_audience,
    'related_activity', (
      SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) FROM (
        SELECT id, event_type, severity, metadata, created_at
        FROM public.platform_activity_logs
        WHERE event_type IN ('notification_campaign_created','notification_campaign_queued','notification_campaign_sent','notification_campaign_failed')
          AND metadata->>'campaign_id' = campaign_uuid::text
        ORDER BY created_at DESC LIMIT 20
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =========================================================
-- create_notification_campaign
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_notification_campaign(
  p_title text,
  p_message text,
  p_target_type text DEFAULT 'all',
  p_target_value text DEFAULT NULL,
  p_delivery_channel text DEFAULT 'email',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  IF coalesce(trim(p_title),'') = '' OR coalesce(trim(p_message),'') = '' THEN
    RAISE EXCEPTION 'title and message are required';
  END IF;

  IF p_target_type NOT IN ('all','tier','organisation','status','churn_risk') THEN
    RAISE EXCEPTION 'invalid target_type: %', p_target_type;
  END IF;

  IF p_delivery_channel NOT IN ('email','in_app','webhook') THEN
    RAISE EXCEPTION 'invalid delivery_channel: %', p_delivery_channel;
  END IF;

  SELECT count(*) INTO v_count FROM public.preview_notification_audience(p_target_type, p_target_value);

  INSERT INTO public.platform_notification_campaigns(
    created_by, title, message, target_type, target_value,
    delivery_channel, status, recipient_count, metadata
  ) VALUES (
    v_admin, p_title, p_message, p_target_type, p_target_value,
    p_delivery_channel, 'draft', coalesce(v_count,0), coalesce(p_metadata,'{}'::jsonb)
  )
  RETURNING id INTO v_id;

  INSERT INTO public.platform_activity_logs(event_type, event_source, severity, user_id, metadata)
  VALUES (
    'notification_campaign_created', 'notifications_centre', 'info', v_admin,
    jsonb_build_object('campaign_id', v_id, 'title', p_title, 'target_type', p_target_type,
                       'target_value', p_target_value, 'recipient_count', v_count,
                       'delivery_channel', p_delivery_channel)
  );

  RETURN v_id;
END;
$$;

-- =========================================================
-- queue_notification_campaign
-- =========================================================
CREATE OR REPLACE FUNCTION public.queue_notification_campaign(campaign_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_notification_campaigns;
  v_count integer;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT * INTO v_row FROM public.platform_notification_campaigns WHERE id = campaign_uuid;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'campaign not found'; END IF;
  IF v_row.status NOT IN ('draft','failed') THEN
    RAISE EXCEPTION 'campaign is not in a queueable state (current: %)', v_row.status;
  END IF;

  SELECT count(*) INTO v_count FROM public.preview_notification_audience(v_row.target_type, v_row.target_value);

  UPDATE public.platform_notification_campaigns
     SET status = 'queued',
         recipient_count = coalesce(v_count,0),
         queued_at = now()
   WHERE id = campaign_uuid;

  INSERT INTO public.platform_activity_logs(event_type, event_source, severity, user_id, metadata)
  VALUES (
    'notification_campaign_queued', 'notifications_centre', 'warning', v_admin,
    jsonb_build_object('campaign_id', campaign_uuid, 'recipient_count', v_count,
                       'target_type', v_row.target_type, 'target_value', v_row.target_value,
                       'delivery_channel', v_row.delivery_channel)
  );

  RETURN json_build_object('campaign_id', campaign_uuid, 'status', 'queued', 'recipient_count', v_count);
END;
$$;