-- Update all existing lowercase 'male' and 'female' values to capitalized 'Male' and 'Female'
UPDATE "Elite Athlete Data"
SET "Sex" = 'Male'
WHERE "Sex" = 'male';

UPDATE "Elite Athlete Data"
SET "Sex" = 'Female'
WHERE "Sex" = 'female';

-- Add a check constraint to ensure only 'Male' or 'Female' can be stored
ALTER TABLE "Elite Athlete Data"
ADD CONSTRAINT sex_capitalization_check 
CHECK ("Sex" IN ('Male', 'Female', ''));