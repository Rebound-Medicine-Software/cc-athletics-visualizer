
-- Phase H16: Platform Settings Governance

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  is_enabled boolean,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_category ON public.platform_settings(category);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role platform_settings"
  ON public.platform_settings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "super admins manage platform_settings"
  ON public.platform_settings FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "authenticated can read platform_settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.touch_platform_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_platform_settings_updated_at();

-- Seed canonical feature flags (operational flags already referenced in the UI)
INSERT INTO public.platform_settings (key, value, category, description, is_enabled) VALUES
  ('feature_flag.ai_coach_v2',         '{}'::jsonb, 'feature_flag', 'AI Coach v2 (GPT-4o) — use latest model for insights', true),
  ('feature_flag.cal_com_v2',          '{}'::jsonb, 'feature_flag', 'Cal.com API v2 — routed via cal-com-proxy',           true),
  ('feature_flag.pingram_emails',      '{}'::jsonb, 'feature_flag', 'Pingram Email Channel — backup notification provider', false),
  ('feature_flag.elite_benchmark_gen', '{}'::jsonb, 'feature_flag', 'Elite Benchmark Generation — top-decile aggregation jobs', true),
  ('feature_flag.public_signup',       '{}'::jsonb, 'feature_flag', 'Public Org Signup — open signup vs invite-only',       false),
  ('feature_flag.experimental_3d',     '{}'::jsonb, 'feature_flag', '3D Force Visualisation — WebGL chart for force plates', true)
ON CONFLICT (key) DO NOTHING;

-- RPC: get all platform settings, optionally filtered by category
CREATE OR REPLACE FUNCTION public.get_platform_settings(p_category text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  key text,
  value jsonb,
  category text,
  description text,
  is_enabled boolean,
  updated_by uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  RETURN QUERY
  SELECT s.id, s.key, s.value, s.category, s.description, s.is_enabled, s.updated_by, s.updated_at
  FROM public.platform_settings s
  WHERE p_category IS NULL OR s.category = p_category
  ORDER BY s.category, s.key;
END;
$$;

-- RPC: list feature flags
CREATE OR REPLACE FUNCTION public.list_feature_flags()
RETURNS TABLE (
  id uuid,
  key text,
  description text,
  is_enabled boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  RETURN QUERY
  SELECT s.id, s.key, s.description, COALESCE(s.is_enabled, false), s.updated_at
  FROM public.platform_settings s
  WHERE s.category = 'feature_flag'
  ORDER BY s.key;
END;
$$;

-- RPC: upsert a setting (value-based)
CREATE OR REPLACE FUNCTION public.upsert_platform_setting(
  p_key text,
  p_value jsonb,
  p_category text DEFAULT 'general',
  p_description text DEFAULT NULL
)
RETURNS public.platform_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_settings;
  v_old jsonb;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  SELECT value INTO v_old FROM public.platform_settings WHERE key = p_key;

  INSERT INTO public.platform_settings (key, value, category, description, updated_by, updated_at)
  VALUES (p_key, p_value, p_category, p_description, auth.uid(), now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        category = COALESCE(EXCLUDED.category, public.platform_settings.category),
        description = COALESCE(EXCLUDED.description, public.platform_settings.description),
        updated_by = auth.uid(),
        updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, user_id, metadata)
  VALUES (
    'platform_setting_updated',
    'control_centre.settings',
    'info',
    auth.uid(),
    jsonb_build_object('key', p_key, 'category', p_category, 'old_value', v_old, 'new_value', p_value)
  );

  RETURN v_row;
END;
$$;

-- RPC: toggle/set a feature flag
CREATE OR REPLACE FUNCTION public.set_feature_flag(p_key text, p_enabled boolean)
RETURNS public.platform_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.platform_settings;
  v_old boolean;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: super admin only';
  END IF;

  SELECT is_enabled INTO v_old FROM public.platform_settings WHERE key = p_key;

  UPDATE public.platform_settings
     SET is_enabled = p_enabled,
         updated_by = auth.uid(),
         updated_at = now()
   WHERE key = p_key AND category = 'feature_flag'
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'feature flag not found: %', p_key;
  END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, user_id, metadata)
  VALUES (
    'feature_flag_toggled',
    'control_centre.settings',
    'info',
    auth.uid(),
    jsonb_build_object('key', p_key, 'old', v_old, 'new', p_enabled)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_settings(text)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_feature_flags()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_platform_setting(text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_feature_flag(text, boolean)         TO authenticated;
