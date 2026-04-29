
-- Tier templates table
CREATE TABLE IF NOT EXISTS public.platform_tier_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  max_bookings_per_month integer NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_tier_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admins manage platform_tier_templates"
ON public.platform_tier_templates FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "service role platform_tier_templates"
ON public.platform_tier_templates FOR ALL
USING (auth.role() = 'service_role');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_platform_tier_templates_updated ON public.platform_tier_templates;
CREATE TRIGGER trg_platform_tier_templates_updated
BEFORE UPDATE ON public.platform_tier_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RPCs =====

CREATE OR REPLACE FUNCTION public.list_platform_tier_templates()
RETURNS SETOF public.platform_tier_templates
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  RETURN QUERY SELECT * FROM public.platform_tier_templates ORDER BY monthly_price ASC, name ASC;
END; $$;

CREATE OR REPLACE FUNCTION public.upsert_platform_tier_template(
  p_id uuid,
  p_name text,
  p_description text,
  p_monthly_price numeric,
  p_max_bookings_per_month integer,
  p_permissions jsonb,
  p_is_active boolean
) RETURNS public.platform_tier_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE row public.platform_tier_templates;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.platform_tier_templates (name, description, monthly_price, max_bookings_per_month, permissions, is_active, updated_by)
    VALUES (p_name, p_description, coalesce(p_monthly_price,0), coalesce(p_max_bookings_per_month,0), coalesce(p_permissions,'{}'::jsonb), coalesce(p_is_active,true), auth.uid())
    RETURNING * INTO row;

    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, metadata, user_id)
    VALUES ('platform_tier_template_created','control_centre.settings','info',
      jsonb_build_object('template_id', row.id, 'name', row.name, 'monthly_price', row.monthly_price), auth.uid());
  ELSE
    UPDATE public.platform_tier_templates SET
      name = p_name,
      description = p_description,
      monthly_price = coalesce(p_monthly_price,0),
      max_bookings_per_month = coalesce(p_max_bookings_per_month,0),
      permissions = coalesce(p_permissions,'{}'::jsonb),
      is_active = coalesce(p_is_active,true),
      updated_by = auth.uid()
    WHERE id = p_id
    RETURNING * INTO row;
    IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, metadata, user_id)
    VALUES ('platform_tier_template_updated','control_centre.settings','info',
      jsonb_build_object('template_id', row.id, 'name', row.name, 'monthly_price', row.monthly_price), auth.uid());
  END IF;
  RETURN row;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_platform_tier_template(p_id uuid, p_is_active boolean)
RETURNS public.platform_tier_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE row public.platform_tier_templates;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  UPDATE public.platform_tier_templates SET is_active = p_is_active, updated_by = auth.uid()
  WHERE id = p_id RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, metadata, user_id)
  VALUES (CASE WHEN p_is_active THEN 'platform_tier_template_enabled' ELSE 'platform_tier_template_disabled' END,
    'control_centre.settings','info',
    jsonb_build_object('template_id', row.id, 'name', row.name), auth.uid());
  RETURN row;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_platform_tier_template(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE row public.platform_tier_templates;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  DELETE FROM public.platform_tier_templates WHERE id = p_id RETURNING * INTO row;
  IF NOT FOUND THEN RAISE EXCEPTION 'template not found'; END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, metadata, user_id)
  VALUES ('platform_tier_template_deleted','control_centre.settings','warning',
    jsonb_build_object('template_id', row.id, 'name', row.name), auth.uid());
  RETURN true;
END; $$;

-- ===== Default Branding (stored in platform_settings) =====

CREATE OR REPLACE FUNCTION public.get_default_branding_settings()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  SELECT value INTO v FROM public.platform_settings WHERE key = 'default_branding' LIMIT 1;
  IF v IS NULL THEN
    v := jsonb_build_object(
      'primary_color', '#3B82F6',
      'secondary_color', '#1E40AF',
      'accent_color', '#F59E0B',
      'font_family', 'Inter',
      'logo_url', NULL
    );
  END IF;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.update_default_branding_settings(p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'unauthorised'; END IF;
  IF p_value IS NULL THEN RAISE EXCEPTION 'value required'; END IF;

  INSERT INTO public.platform_settings (key, value, category, description, updated_by)
  VALUES ('default_branding', p_value, 'branding', 'Platform default branding (fallback for organisations)', auth.uid())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        category = 'branding',
        updated_by = auth.uid(),
        updated_at = now();

  INSERT INTO public.platform_activity_logs (event_type, event_source, severity, metadata, user_id)
  VALUES ('default_branding_updated','control_centre.settings','info',
    jsonb_build_object('keys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(p_value) k)), auth.uid());

  RETURN p_value;
END; $$;
