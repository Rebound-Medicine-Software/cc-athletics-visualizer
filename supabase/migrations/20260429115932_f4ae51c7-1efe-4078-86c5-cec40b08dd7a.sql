-- =============================================================================
-- Phase H18: Organisation Lifecycle Actions
-- Super Admin RPCs to suspend/reactivate/upgrade/message organisations
-- with structured audit logging to platform_activity_logs.
-- =============================================================================

-- ---------- 1. suspend_organisation ----------
CREATE OR REPLACE FUNCTION public.suspend_organisation(
  team_uuid uuid,
  reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_prev_status text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins may suspend organisations';
  END IF;

  IF reason IS NULL OR length(trim(reason)) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  SELECT name, organisation_status INTO v_org_name, v_prev_status
  FROM public.teams WHERE id = team_uuid;

  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  UPDATE public.teams
     SET organisation_status = 'suspended',
         subscription_status = 'suspended',
         updated_at = now()
   WHERE id = team_uuid;

  INSERT INTO public.platform_activity_logs
    (event_type, event_source, severity, team_id, organisation_name, user_id, metadata)
  VALUES (
    'organisation_suspended',
    'control_centre',
    'warning',
    team_uuid,
    v_org_name,
    auth.uid(),
    jsonb_build_object(
      'reason', reason,
      'previous_status', v_prev_status,
      'new_status', 'suspended'
    )
  );

  RETURN jsonb_build_object('ok', true, 'team_id', team_uuid, 'status', 'suspended');
END;
$$;

REVOKE ALL ON FUNCTION public.suspend_organisation(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.suspend_organisation(uuid, text) TO authenticated;

-- ---------- 2. reactivate_organisation ----------
CREATE OR REPLACE FUNCTION public.reactivate_organisation(
  team_uuid uuid,
  reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_prev_status text;
  v_new_sub_status text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins may reactivate organisations';
  END IF;

  IF reason IS NULL OR length(trim(reason)) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  SELECT name, organisation_status INTO v_org_name, v_prev_status
  FROM public.teams WHERE id = team_uuid;

  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  -- If they had an active billing subscription, restore active; otherwise return to trial
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.billing_subscriptions
                  WHERE team_id = team_uuid AND status = 'active')
    THEN 'active'
    ELSE 'trial'
  END INTO v_new_sub_status;

  UPDATE public.teams
     SET organisation_status = 'active',
         subscription_status = v_new_sub_status,
         updated_at = now()
   WHERE id = team_uuid;

  INSERT INTO public.platform_activity_logs
    (event_type, event_source, severity, team_id, organisation_name, user_id, metadata)
  VALUES (
    'organisation_reactivated',
    'control_centre',
    'info',
    team_uuid,
    v_org_name,
    auth.uid(),
    jsonb_build_object(
      'reason', reason,
      'previous_status', v_prev_status,
      'new_status', 'active',
      'subscription_status', v_new_sub_status
    )
  );

  RETURN jsonb_build_object('ok', true, 'team_id', team_uuid, 'status', 'active');
END;
$$;

REVOKE ALL ON FUNCTION public.reactivate_organisation(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_organisation(uuid, text) TO authenticated;

-- ---------- 3. update_organisation_tier ----------
CREATE OR REPLACE FUNCTION public.update_organisation_tier(
  team_uuid uuid,
  new_tier_name text,
  reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_prev_tier text;
  v_new_tier_id uuid;
  v_stripe_connected boolean := false;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins may change organisation tiers';
  END IF;

  IF new_tier_name IS NULL OR length(trim(new_tier_name)) = 0 THEN
    RAISE EXCEPTION 'A target tier name is required';
  END IF;

  IF reason IS NULL OR length(trim(reason)) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  SELECT name INTO v_org_name FROM public.teams WHERE id = team_uuid;
  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  -- Resolve target tier (prefer team-scoped, fall back to global template)
  SELECT id INTO v_new_tier_id
  FROM public.tiers
  WHERE name = new_tier_name AND (team_id = team_uuid OR team_id IS NULL)
  ORDER BY (team_id = team_uuid) DESC NULLS LAST
  LIMIT 1;

  -- Track previous tier name for audit
  SELECT t.name INTO v_prev_tier
  FROM public.tiers t
  JOIN public.teams te ON te.tier_id = t.id
  WHERE te.id = team_uuid;

  -- Update team's tier reference (if a tier row was found)
  UPDATE public.teams
     SET tier_id = COALESCE(v_new_tier_id, tier_id),
         updated_at = now()
   WHERE id = team_uuid;

  -- Mirror tier change onto billing_subscriptions (local fields only — Stripe sync NOT performed)
  UPDATE public.billing_subscriptions
     SET tier_name = new_tier_name
   WHERE team_id = team_uuid;

  -- Detect Stripe connection state for audit context
  SELECT EXISTS (
    SELECT 1 FROM public.billing_subscriptions
    WHERE team_id = team_uuid AND stripe_subscription_id IS NOT NULL
  ) INTO v_stripe_connected;

  INSERT INTO public.platform_activity_logs
    (event_type, event_source, severity, team_id, organisation_name, user_id, metadata)
  VALUES (
    'organisation_tier_updated',
    'control_centre',
    'info',
    team_uuid,
    v_org_name,
    auth.uid(),
    jsonb_build_object(
      'reason', reason,
      'previous_tier', v_prev_tier,
      'new_tier', new_tier_name,
      'stripe_sync_required', v_stripe_connected,
      'stripe_synced', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'team_id', team_uuid,
    'new_tier', new_tier_name,
    'stripe_sync_required', v_stripe_connected,
    'stripe_synced', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_organisation_tier(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_organisation_tier(uuid, text, text) TO authenticated;

-- ---------- 4. send_organisation_message ----------
CREATE OR REPLACE FUNCTION public.send_organisation_message(
  team_uuid uuid,
  subject text,
  message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_owner_user_id uuid;
  v_message_id uuid;
  v_recipient_count int := 0;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins may send organisation messages';
  END IF;

  IF subject IS NULL OR length(trim(subject)) = 0 THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;
  IF message IS NULL OR length(trim(message)) < 3 THEN
    RAISE EXCEPTION 'A message of at least 3 characters is required';
  END IF;

  SELECT name, owner_user_id INTO v_org_name, v_owner_user_id
  FROM public.teams WHERE id = team_uuid;

  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organisation not found';
  END IF;

  -- Send to organisation owner if known; otherwise log a broadcast intent
  IF v_owner_user_id IS NOT NULL THEN
    INSERT INTO public.messages
      (from_user_id, to_user_id, team_id, subject, message_body, status)
    VALUES
      (auth.uid(), v_owner_user_id, team_uuid, subject, message, 'unread')
    RETURNING id INTO v_message_id;
    v_recipient_count := 1;
  END IF;

  INSERT INTO public.platform_activity_logs
    (event_type, event_source, severity, team_id, organisation_name, user_id, metadata)
  VALUES (
    'organisation_message_sent',
    'control_centre',
    'info',
    team_uuid,
    v_org_name,
    auth.uid(),
    jsonb_build_object(
      'subject', subject,
      'message_preview', left(message, 200),
      'recipient_count', v_recipient_count,
      'message_id', v_message_id,
      'owner_known', v_owner_user_id IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'team_id', team_uuid,
    'message_id', v_message_id,
    'recipient_count', v_recipient_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_organisation_message(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_organisation_message(uuid, text, text) TO authenticated;

-- ---------- 5. list_organisation_audit_events ----------
-- Used by the Organisations page "Audit" row action to show recent events for one org
CREATE OR REPLACE FUNCTION public.list_organisation_audit_events(
  team_uuid uuid,
  row_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  event_type text,
  event_source text,
  severity text,
  user_id uuid,
  user_label text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins may view organisation audit events';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.event_type,
    l.event_source,
    l.severity,
    l.user_id,
    COALESCE(p.full_name, p.email, sa.full_name, sa.email)::text AS user_label,
    l.metadata,
    l.created_at
  FROM public.platform_activity_logs l
  LEFT JOIN public.profiles p ON p.user_id = l.user_id
  LEFT JOIN public.super_admin_users sa ON sa.auth_user_id = l.user_id
  WHERE l.team_id = team_uuid
  ORDER BY l.created_at DESC
  LIMIT row_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_organisation_audit_events(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_organisation_audit_events(uuid, int) TO authenticated;