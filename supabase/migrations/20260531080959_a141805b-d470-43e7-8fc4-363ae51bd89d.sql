
WITH api AS (
  SELECT id, cc_athlete_id, team_name
  FROM public.test_data
  WHERE source = 'api' AND team_id IS NULL AND athlete_id IS NULL
),
cand AS (
  SELECT api.id AS api_id, ath.id AS athlete_id, ath.team_id
  FROM api
  JOIN public.athletes ath
    ON ath.cc_athlete_id = api.cc_athlete_id AND ath.team_id IS NOT NULL
  JOIN public.teams t
    ON t.id = ath.team_id
   AND lower(trim(t.name)) = lower(trim(api.team_name))
),
unique_match AS (
  SELECT api_id,
         (array_agg(athlete_id))[1] AS athlete_id,
         (array_agg(team_id))[1] AS team_id
  FROM cand
  GROUP BY api_id
  HAVING count(DISTINCT athlete_id) = 1 AND count(DISTINCT team_id) = 1
)
UPDATE public.test_data td
SET athlete_id = um.athlete_id,
    team_id = um.team_id,
    updated_at = now()
FROM unique_match um
WHERE td.id = um.api_id;
