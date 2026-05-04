-- PGM7.1: Canonical client-to-athlete linkage via user_id

-- 1) Add nullable user_id column with FK to auth.users (ON DELETE SET NULL)
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON public.athletes(user_id);

-- 2) Best-effort backfill: only when exactly one matching profile in same team
WITH candidates AS (
  SELECT a.id AS athlete_id,
         (SELECT p.user_id
            FROM public.profiles p
           WHERE p.team_id = a.team_id
             AND lower(p.email) = lower(a.email)
           LIMIT 2) AS sample_user_id,
         (SELECT COUNT(*)
            FROM public.profiles p
           WHERE p.team_id = a.team_id
             AND lower(p.email) = lower(a.email)) AS match_count
  FROM public.athletes a
  WHERE a.user_id IS NULL
    AND a.email IS NOT NULL
    AND a.email <> ''
    AND a.team_id IS NOT NULL
)
UPDATE public.athletes a
   SET user_id = c.sample_user_id
  FROM candidates c
 WHERE a.id = c.athlete_id
   AND c.match_count = 1
   AND c.sample_user_id IS NOT NULL;

-- 3) RLS: allow a client to read their own athlete row via user_id
--    (additive — does not weaken existing team-based policy)
DROP POLICY IF EXISTS "client can view own athlete row" ON public.athletes;
CREATE POLICY "client can view own athlete row"
  ON public.athletes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4) RLS: allow a client to read their own assignments via athlete.user_id
DROP POLICY IF EXISTS "client can view own assignments" ON public.athlete_program_assignments;
CREATE POLICY "client can view own assignments"
  ON public.athlete_program_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_program_assignments.athlete_id
        AND a.user_id = auth.uid()
    )
  );

-- 5) RLS: allow a client to read & insert their own completion logs
DROP POLICY IF EXISTS "client can view own completion logs" ON public.programme_completion_logs;
CREATE POLICY "client can view own completion logs"
  ON public.programme_completion_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.athlete_program_assignments apa
        JOIN public.athletes a ON a.id = apa.athlete_id
       WHERE apa.id = programme_completion_logs.assignment_id
         AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "client can insert own completion logs" ON public.programme_completion_logs;
CREATE POLICY "client can insert own completion logs"
  ON public.programme_completion_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.athlete_program_assignments apa
        JOIN public.athletes a ON a.id = apa.athlete_id
       WHERE apa.id = programme_completion_logs.assignment_id
         AND a.user_id = auth.uid()
         AND apa.team_id = programme_completion_logs.team_id
    )
  );

-- 6) Self-heal RPC: allows an authenticated client to claim an athlete row
--    matching their email within a team — only when user_id is currently null
--    and exactly one match exists. SECURITY DEFINER so it can write past RLS,
--    but tightly scoped to the calling user.
CREATE OR REPLACE FUNCTION public.claim_athlete_for_current_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_team_id uuid;
  v_athlete_id uuid;
  v_match_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(email), team_id
    INTO v_email, v_team_id
    FROM public.profiles
   WHERE user_id = v_user_id
   LIMIT 1;

  IF v_email IS NULL OR v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- If already linked, return it.
  SELECT id INTO v_athlete_id
    FROM public.athletes
   WHERE user_id = v_user_id
   LIMIT 1;
  IF v_athlete_id IS NOT NULL THEN
    RETURN v_athlete_id;
  END IF;

  SELECT COUNT(*) INTO v_match_count
    FROM public.athletes
   WHERE team_id = v_team_id
     AND lower(email) = v_email
     AND user_id IS NULL;

  IF v_match_count <> 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.athletes
     SET user_id = v_user_id
   WHERE team_id = v_team_id
     AND lower(email) = v_email
     AND user_id IS NULL
  RETURNING id INTO v_athlete_id;

  RETURN v_athlete_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_athlete_for_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_athlete_for_current_user() TO authenticated;