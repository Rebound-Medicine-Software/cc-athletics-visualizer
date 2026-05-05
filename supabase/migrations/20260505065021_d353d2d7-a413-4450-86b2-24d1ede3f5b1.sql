
-- 1. Parent/child team hierarchy
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS parent_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_parent_team_id ON public.teams(parent_team_id);

-- 2. Backfill: child CC teams ingested via the global Evolve API key
-- Rule: any team with a real cc_team_id, no api_key of its own, and no children
-- becomes a child of the Evolve workspace (canonical id 2577a78f...).
UPDATE public.teams
SET parent_team_id = '2577a78f-edf7-4201-a70b-db764ce489fc'
WHERE parent_team_id IS NULL
  AND id <> '2577a78f-edf7-4201-a70b-db764ce489fc'
  AND cc_team_id IS NOT NULL
  AND (api_key IS NULL OR api_key = '')
  AND cc_team_id NOT LIKE 'temp-%';

-- 3. Workspace resolver: my team + all children
CREATE OR REPLACE FUNCTION public.get_my_workspace_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH my AS (
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
  SELECT team_id FROM my WHERE team_id IS NOT NULL
  UNION
  SELECT t.id
  FROM public.teams t, my
  WHERE t.parent_team_id = my.team_id;
$$;

-- 4. Update access helper: super admin OR row in (my team + children)
CREATE OR REPLACE FUNCTION public.can_access_team_row(row_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR row_team_id IN (SELECT public.get_my_workspace_team_ids());
$$;
