
-- list unlinked athletes with profile matches in same team
CREATE OR REPLACE FUNCTION public.list_unlinked_athletes_with_profile_matches(team_uuid uuid)
RETURNS TABLE (
  athlete_id uuid,
  athlete_name text,
  athlete_email text,
  athlete_last_test_at timestamptz,
  match_user_id uuid,
  match_profile_id uuid,
  match_email text,
  match_full_name text,
  match_role text,
  match_setup_completed boolean,
  match_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.can_access_team_row(team_uuid) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  WITH unlinked AS (
    SELECT a.id, a.name, a.email, a.last_test_at
    FROM public.athletes a
    WHERE a.team_id = team_uuid AND a.user_id IS NULL
  ),
  matches AS (
    SELECT
      u.id AS athlete_id,
      u.name AS athlete_name,
      u.email AS athlete_email,
      u.last_test_at AS athlete_last_test_at,
      p.user_id AS match_user_id,
      p.id AS match_profile_id,
      p.email AS match_email,
      p.full_name AS match_full_name,
      p.role AS match_role,
      p.setup_completed AS match_setup_completed
    FROM unlinked u
    LEFT JOIN public.profiles p
      ON p.team_id = team_uuid
     AND u.email IS NOT NULL
     AND lower(p.email) = lower(u.email)
  ),
  counts AS (
    SELECT athlete_id, COUNT(match_user_id)::int AS c
    FROM matches GROUP BY athlete_id
  )
  SELECT m.athlete_id, m.athlete_name, m.athlete_email, m.athlete_last_test_at,
         m.match_user_id, m.match_profile_id, m.match_email, m.match_full_name,
         m.match_role, m.match_setup_completed, c.c
  FROM matches m
  JOIN counts c ON c.athlete_id = m.athlete_id
  ORDER BY m.athlete_name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_unlinked_athletes_with_profile_matches(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.list_unlinked_athletes_with_profile_matches(uuid) TO authenticated;

-- link athlete to user
CREATE OR REPLACE FUNCTION public.link_athlete_to_user(athlete_uuid uuid, user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team uuid;
  v_existing uuid;
  v_profile_team uuid;
BEGIN
  SELECT team_id INTO v_team FROM public.athletes WHERE id = athlete_uuid;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'athlete not found';
  END IF;

  IF NOT (public.can_access_team_row(v_team) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT team_id INTO v_profile_team FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
  IF v_profile_team IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF v_profile_team <> v_team AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'profile is not in the same team as the athlete';
  END IF;

  SELECT id INTO v_existing FROM public.athletes WHERE user_id = user_uuid AND id <> athlete_uuid LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'this user is already linked to another athlete';
  END IF;

  UPDATE public.athletes
  SET user_id = user_uuid, updated_at = now()
  WHERE id = athlete_uuid AND user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'athlete is already linked to a user';
  END IF;

  INSERT INTO public.platform_activity_logs (event_type, event_source, team_id, athlete_id, user_id, metadata, severity)
  VALUES ('athlete_user_linked', 'pgm7_2', v_team, athlete_uuid, auth.uid(),
          jsonb_build_object('linked_user_id', user_uuid), 'info');

  RETURN athlete_uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.link_athlete_to_user(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.link_athlete_to_user(uuid, uuid) TO authenticated;

-- unlink athlete user
CREATE OR REPLACE FUNCTION public.unlink_athlete_user(athlete_uuid uuid, reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team uuid;
  v_prev_user uuid;
BEGIN
  SELECT team_id, user_id INTO v_team, v_prev_user FROM public.athletes WHERE id = athlete_uuid;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'athlete not found';
  END IF;

  IF NOT (public.can_access_team_row(v_team) OR public.is_super_admin()) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  IF v_prev_user IS NULL THEN
    RETURN athlete_uuid;
  END IF;

  UPDATE public.athletes
  SET user_id = NULL, updated_at = now()
  WHERE id = athlete_uuid;

  INSERT INTO public.platform_activity_logs (event_type, event_source, team_id, athlete_id, user_id, metadata, severity)
  VALUES ('athlete_user_unlinked', 'pgm7_2', v_team, athlete_uuid, auth.uid(),
          jsonb_build_object('previous_user_id', v_prev_user, 'reason', COALESCE(reason, '')), 'info');

  RETURN athlete_uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.unlink_athlete_user(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.unlink_athlete_user(uuid, text) TO authenticated;
