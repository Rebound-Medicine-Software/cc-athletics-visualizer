
-- Backfill: link athletes.user_id where there's a unique email match in auth.users
-- and set profile.team_id / role='client' accordingly.
-- Safe: only links 1:1 matches; never crosses teams.

-- Step 1: link athletes.user_id by matching auth.users.email when unique
WITH candidates AS (
  SELECT a.id AS athlete_id, u.id AS user_id
  FROM public.athletes a
  JOIN auth.users u ON lower(u.email) = lower(a.email)
  WHERE a.user_id IS NULL
    AND a.email IS NOT NULL
), unique_matches AS (
  SELECT athlete_id, user_id
  FROM candidates
  WHERE athlete_id IN (
    SELECT athlete_id FROM candidates GROUP BY athlete_id HAVING COUNT(*) = 1
  )
  AND user_id IN (
    SELECT user_id FROM candidates GROUP BY user_id HAVING COUNT(*) = 1
  )
)
UPDATE public.athletes a
SET user_id = um.user_id
FROM unique_matches um
WHERE a.id = um.athlete_id;

-- Step 2: ensure profiles for linked athletes have team_id and role='client'
UPDATE public.profiles p
SET team_id = COALESCE(p.team_id, a.team_id),
    role = CASE
      WHEN p.role IN ('staff','client') THEN 'client'
      ELSE p.role
    END
FROM public.athletes a
WHERE a.user_id = p.user_id
  AND a.team_id IS NOT NULL
  AND (p.team_id IS DISTINCT FROM a.team_id OR p.role = 'staff');

-- Step 3: secure RPC for edge function / caller to finalize a client link
-- Callable by service role only (used by send-client-credentials edge function).
CREATE OR REPLACE FUNCTION public.link_client_to_athlete(
  p_user_id uuid,
  p_athlete_id uuid,
  p_team_id uuid,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service_role or super_admin may invoke
  IF auth.role() <> 'service_role' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  -- Link athlete to user, scoped to provided team
  UPDATE public.athletes
     SET user_id = p_user_id
   WHERE id = p_athlete_id
     AND team_id = p_team_id;

  -- Promote profile to client and attach team
  UPDATE public.profiles
     SET role = 'client',
         team_id = p_team_id,
         created_by = COALESCE(created_by, p_created_by)
   WHERE user_id = p_user_id;
END;
$$;
