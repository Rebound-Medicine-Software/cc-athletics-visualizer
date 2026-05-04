
-- 1) Merge cc_team_id onto canonical Evolve athletes (only safe non-null diff for Lee/Lowri)
UPDATE athletes
SET cc_team_id = '-ONoOLVb1kyWZtJh7fOj'
WHERE team_id = '2577a78f-edf7-4201-a70b-db764ce489fc'
  AND cc_athlete_id IN ('-ONoOa_-G_VBbFORbP45','-ONoPNdiwHlpPjfD8KjG')
  AND cc_team_id IS NULL;

-- 2) Delete duplicate athlete rows on the duplicate Evolve team
DELETE FROM athletes
WHERE team_id = 'f1adca34-ac5b-4167-902d-5393e33eb950'
  AND cc_athlete_id IN ('-ONoOa_-G_VBbFORbP45','-ONoPNdiwHlpPjfD8KjG');

-- 3) Delete the now-empty duplicate Evolve team FIRST (frees the unique cc_team_id)
DELETE FROM teams t
WHERE t.id = 'f1adca34-ac5b-4167-902d-5393e33eb950'
  AND NOT EXISTS (SELECT 1 FROM athletes a WHERE a.team_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.team_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.team_id = t.id);

-- 4) Move real cc_team_id onto canonical Evolve team
UPDATE teams
SET cc_team_id = '-ONoOLVb1kyWZtJh7fOj'
WHERE id = '2577a78f-edf7-4201-a70b-db764ce489fc';

-- 5) Backfill cc_team_id on remaining Evolve athletes
UPDATE athletes
SET cc_team_id = '-ONoOLVb1kyWZtJh7fOj'
WHERE team_id = '2577a78f-edf7-4201-a70b-db764ce489fc'
  AND (cc_team_id IS NULL OR cc_team_id <> '-ONoOLVb1kyWZtJh7fOj');

-- 6) Delete 9 Llanelli temp team rows only if empty
DELETE FROM teams t
WHERE t.name = 'Llanelli Town Academy AFC'
  AND t.cc_team_id LIKE 'temp-%'
  AND NOT EXISTS (SELECT 1 FROM athletes a WHERE a.team_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.team_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.team_id = t.id);

-- 7) Audit log
INSERT INTO platform_activity_logs (event_type, event_source, severity, metadata)
VALUES (
  'team_cleanup',
  'phase_a2_dedupe',
  'info',
  jsonb_build_object(
    'evolve_kept_team_id', '2577a78f-edf7-4201-a70b-db764ce489fc',
    'evolve_deleted_team_id', 'f1adca34-ac5b-4167-902d-5393e33eb950',
    'real_cc_team_id_moved', '-ONoOLVb1kyWZtJh7fOj',
    'merged_athletes', jsonb_build_array(
      jsonb_build_object('name','Lee Watkins','cc_athlete_id','-ONoOa_-G_VBbFORbP45','fields_merged', jsonb_build_array('cc_team_id')),
      jsonb_build_object('name','Lowri Thomas','cc_athlete_id','-ONoPNdiwHlpPjfD8KjG','fields_merged', jsonb_build_array('cc_team_id'))
    ),
    'duplicate_athlete_rows_deleted', 2,
    'llanelli_temp_rows_deleted_target', 9
  )
);
