
-- ============================================================================
-- FIX 1: Athletes anon consent UPDATE without token verification
-- ============================================================================

DROP POLICY IF EXISTS "Allow public to update consent via token" ON public.athletes;
DROP POLICY IF EXISTS "Anon can read athlete by consent token" ON public.athletes;

-- Restrict anon SELECT to a single row matching the supplied token via RPC only.
-- We keep no broad anon SELECT/UPDATE policy. Both flows go through SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.get_athlete_by_consent_token(_token uuid)
RETURNS TABLE (name text, consent_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.name, a.consent_status
  FROM public.athletes a
  WHERE a.consent_token = _token
    AND a.consent_token IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_athlete_consent(
  _token uuid,
  _signed_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  IF _token IS NULL OR _signed_name IS NULL OR length(trim(_signed_name)) = 0 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  UPDATE public.athletes
     SET consent_status = 'confirmed',
         consent_signed_name = trim(_signed_name),
         consent_signed_at = now()
   WHERE consent_token = _token
     AND consent_status = 'pending';

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.get_athlete_by_consent_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_athlete_by_consent_token(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_athlete_consent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_athlete_consent(uuid, text) TO anon, authenticated;


-- ============================================================================
-- FIX 2: profiles.api_key and profiles.password_hash exposure
-- ============================================================================

-- Revoke column-level SELECT from anon and authenticated so teammates cannot
-- read these via SELECT * even when the row-level policy permits the row.
-- Service role and SECURITY DEFINER functions retain access.
REVOKE SELECT (api_key, password_hash) ON public.profiles FROM anon, authenticated;

-- Self-read of own API key.
CREATE OR REPLACE FUNCTION public.get_my_api_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT api_key FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_api_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_api_key() TO authenticated;

-- Org admin access to team credentials (role + team scoped).
CREATE OR REPLACE FUNCTION public.org_admin_list_team_credentials()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  password_hash text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.email, p.full_name, p.role, p.password_hash
  FROM public.profiles p
  WHERE p.team_id = public.get_my_team_id()
    AND public.get_my_role() = ANY (ARRAY['organisation','super_admin']);
$$;

REVOKE ALL ON FUNCTION public.org_admin_list_team_credentials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_admin_list_team_credentials() TO authenticated;
