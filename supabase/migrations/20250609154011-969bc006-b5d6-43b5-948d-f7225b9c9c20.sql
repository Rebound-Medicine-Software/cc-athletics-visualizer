
-- Add unique constraints to support the upsert operations in the sync function
ALTER TABLE test_data ADD CONSTRAINT test_data_unique_key 
UNIQUE (cc_athlete_id, test_date, test_name, repetition_number);

ALTER TABLE athletes ADD CONSTRAINT athletes_unique_key 
UNIQUE (cc_athlete_id);

ALTER TABLE teams ADD CONSTRAINT teams_unique_key 
UNIQUE (cc_team_id);
