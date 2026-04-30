
-- SSRF-safe URL validator. Returns NULL if safe, or an error code string if blocked.
CREATE OR REPLACE FUNCTION public.validate_webhook_url(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_host text;
  v_lower text;
BEGIN
  IF p_url IS NULL OR length(trim(p_url)) = 0 THEN
    RETURN 'invalid_url';
  END IF;
  v_lower := lower(p_url);
  -- HTTPS only
  IF v_lower !~ '^https://' THEN
    RETURN 'https_required';
  END IF;
  -- Extract hostname (strip scheme, then take up to first '/', ':', '?', '#')
  v_host := regexp_replace(v_lower, '^https://', '');
  v_host := split_part(v_host, '/', 1);
  v_host := split_part(v_host, '?', 1);
  v_host := split_part(v_host, '#', 1);
  -- strip user-info and port
  v_host := split_part(v_host, '@', greatest(1, array_length(string_to_array(v_host, '@'), 1)));
  v_host := split_part(v_host, ':', 1);

  IF v_host IS NULL OR length(v_host) = 0 THEN
    RETURN 'invalid_host';
  END IF;

  -- Block localhost / loopback / unspecified
  IF v_host IN ('localhost', '127.0.0.1', '0.0.0.0', '::1', '::', '[::1]', '[::]') THEN
    RETURN 'blocked_loopback';
  END IF;
  -- Block .local mDNS hostnames and bare hostnames without a dot (likely internal)
  IF v_host LIKE '%.local' OR v_host LIKE '%.localhost' OR v_host LIKE '%.internal' THEN
    RETURN 'blocked_internal_hostname';
  END IF;
  IF position('.' in v_host) = 0 THEN
    RETURN 'blocked_internal_hostname';
  END IF;
  -- IPv4 private / link-local / metadata
  -- 10.0.0.0/8
  IF v_host ~ '^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_private_ip'; END IF;
  -- 127.0.0.0/8
  IF v_host ~ '^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_loopback'; END IF;
  -- 192.168.0.0/16
  IF v_host ~ '^192\.168\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_private_ip'; END IF;
  -- 172.16.0.0/12
  IF v_host ~ '^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_private_ip'; END IF;
  -- 169.254.0.0/16 (link-local + AWS/GCP/Azure metadata 169.254.169.254)
  IF v_host ~ '^169\.254\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_link_local'; END IF;
  -- 100.64.0.0/10 (CGNAT)
  IF v_host ~ '^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_private_ip'; END IF;
  -- 0.0.0.0/8
  IF v_host ~ '^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$' THEN RETURN 'blocked_private_ip'; END IF;
  -- IPv6 link-local fe80::/10 and unique local fc00::/7
  IF v_host ~* '^\[?fe[89ab][0-9a-f]:' OR v_host ~* '^\[?f[cd][0-9a-f]{2}:' THEN
    RETURN 'blocked_private_ip';
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_webhook_url(text) TO authenticated;

-- Tighten create_webhook_endpoint
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
  v_err text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_label IS NULL OR length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'label_required';
  END IF;
  v_err := public.validate_webhook_url(p_url);
  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION '%', v_err;
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

-- Audit RPC for blocked test attempts
CREATE OR REPLACE FUNCTION public.log_webhook_test_blocked(
  p_endpoint_id uuid,
  p_reason text,
  p_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.platform_activity_logs (event_type, event_source, user_id, metadata, severity)
  VALUES (
    'webhook_endpoint_test_blocked',
    'control_centre',
    auth.uid(),
    jsonb_build_object('endpoint_id', p_endpoint_id, 'reason', p_reason, 'url_host', split_part(regexp_replace(lower(coalesce(p_url, '')), '^https?://', ''), '/', 1)),
    'warning'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_webhook_test_blocked(uuid, text, text) TO authenticated;
