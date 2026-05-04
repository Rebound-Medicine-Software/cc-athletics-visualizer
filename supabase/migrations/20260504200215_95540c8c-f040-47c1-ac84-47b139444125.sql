UPDATE athletes a
SET team_id = t.id
FROM teams t
WHERE a.team_id IS NULL
  AND a.cc_team_id IS NOT NULL
  AND t.cc_team_id = a.cc_team_id
  AND (SELECT count(*) FROM teams t2 WHERE t2.cc_team_id = a.cc_team_id) = 1;