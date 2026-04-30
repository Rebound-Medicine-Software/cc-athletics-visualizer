-- ============================================================
-- H24.1 Notification Delivery Surfaces
-- In-app inbox RPCs + Webhook endpoint management RPCs
-- ============================================================

-- ---------- IN-APP INBOX RPCs ----------

CREATE OR REPLACE FUNCTION public.list_my_in_app_notifications(
  p_include_dismissed boolean DEFAULT false,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  campaign_id uuid,
  team_id uuid,
  title text,
  message text,
  severity text,
  metadata jsonb,
  created_at timestamptz,
  read_at timestamptz,
  dismissed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.campaign_id, n.team_id, n.title, n.message, n.severity,
         n.metadata, n.created_at, n.read_at, n.dismissed_at
  FROM public.platform_in_app_notifications n
  WHERE n.recipient_user_id = auth.uid()
    AND (p_include_dismissed OR n.dismissed_at IS NULL)
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.platform_in_app_notifications
     SET read_at = COALESCE(read_at, now())
   WHERE id = p_notification_id
     AND recipient_user_id = auth.uid();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_notification(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.platform_in_app_notifications
     SET dismissed_at = COALESCE(dismissed_at, now()),
         read_at = COALESCE(read_at, now())
   WHERE id = p_notification_id
     AND recipient_user_id = auth.uid();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_unread_in_app_notifications()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.platform_in_app_notifications
  WHERE recipient_user_id = auth.uid()
    AND read_at IS NULL
    AND dismissed_at IS NULL;
$$;

-- ---------- WEBHOOK ENDPOINT MANAGEMENT (Super Admin) ----------

CREATE OR REPLACE FUNCTION public.list_webhook_endpoints()
RETURNS TABLE (
  id uuid,
  label text,
  url text,
  team_id uuid,
  team_name text,
  is_active boolean,
  has_secret boolean,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.label, e.url, e.team_id,
         t.name AS team_name,
         e.is_active,
         (e.secret IS NOT NULL AND length(e.secret) > 0) AS has_secret,
         e.last_success_at, e.last_failure_at, e.failure_reason,
         e.created_at, e.updated_at
  FROM public.platform_webhook_endpoints e
  LEFT JOIN public.teams t ON t.id = e.team_id
  WHERE public.is_super_admin()
  ORDER BY e.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.create_webhook_endpoint(
  p_label text,
  p_url text,
  p_secret text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'label_required';
  END IF;
  IF p_url IS NULL OR p_url !~* '^https?://' THEN
    RAISE EXCEPTION 'invalid_url';
  END IF;

  INSERT INTO public.platform_webhook_endpoints (label, url, secret, team_id, is_active, created_by)
  VALUES (trim(p_label), p_url, NULLIF(p_secret, ''), p_team_id, COALESCE(p_is_active, true), auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.platform_activity_logs (event_type, event_source, user_id, team_id, metadata, severity)
  VALUES ('webhook_endpoint_created', 'control_centre', auth.uid(), p_team_id,
          jsonb_build_object('endpoint_id', v_id, 'label', p_label, 'is_active', p_is_active), 'info');

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_webhook_endpoint(
  p_endpoint_id uuid,
  p_is_active boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.platform_webhook_endpoints
     SET is_active = p_is_active, updated_at = now()
   WHERE id = p_endpoint_id
   RETURNING team_id INTO v_team;

  IF v_team IS NULL AND NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, user_id, team_id, metadata, severity)
  VALUES ('webhook_endpoint_toggled', 'control_centre', auth.uid(), v_team,
          jsonb_build_object('endpoint_id', p_endpoint_id, 'is_active', p_is_active), 'info');

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_webhook_endpoint(p_endpoint_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team uuid;
  v_label text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT team_id, label INTO v_team, v_label
  FROM public.platform_webhook_endpoints
  WHERE id = p_endpoint_id;

  IF v_label IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.platform_webhook_endpoints WHERE id = p_endpoint_id;

  INSERT INTO public.platform_activity_logs (event_type, event_source, user_id, team_id, metadata, severity)
  VALUES ('webhook_endpoint_deleted', 'control_centre', auth.uid(), v_team,
          jsonb_build_object('endpoint_id', p_endpoint_id, 'label', v_label), 'warning');

  RETURN true;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.list_my_in_app_notifications(boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unread_in_app_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_webhook_endpoints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_webhook_endpoint(text, text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_webhook_endpoint(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_webhook_endpoint(uuid) TO authenticated;