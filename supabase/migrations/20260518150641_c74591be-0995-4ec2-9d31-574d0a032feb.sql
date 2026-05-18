
-- Fix: link client jrfisherr@gmail.com to the correct athlete row in their practitioner team,
-- and consolidate the duplicate so all assigned programmes are visible to the athlete.

-- 1) Unlink the stale cross-team athlete (was hijacking useClientAthlete lookup).
UPDATE public.athletes
SET user_id = NULL, updated_at = now()
WHERE id = '706666fc-5399-4a20-a547-63ea8e282375'
  AND user_id = '48d47dea-4868-45b0-aeeb-3ea442945c5c';

-- 2) Re-point assignments from duplicate athlete (626d786b) to the canonical row (7b50bf7f).
UPDATE public.athlete_program_assignments
SET athlete_id = '7b50bf7f-53ef-4edc-b88c-fdb541878f7c', updated_at = now()
WHERE athlete_id = '626d786b-459f-4136-990f-304a43cb1214';

-- Same for any completion logs already on the duplicate.
UPDATE public.programme_completion_logs
SET updated_at = now()
WHERE assignment_id IN (
  SELECT id FROM public.athlete_program_assignments
  WHERE athlete_id = '7b50bf7f-53ef-4edc-b88c-fdb541878f7c'
);

-- 3) Mark the now-empty duplicate so it stops appearing in practitioner pickers.
UPDATE public.athletes
SET name = name || ' (duplicate – archived)',
    activity_status = 'archived',
    updated_at = now()
WHERE id = '626d786b-459f-4136-990f-304a43cb1214';

-- 4) Link the client's auth account to the canonical practitioner-team athlete.
UPDATE public.athletes
SET user_id = '48d47dea-4868-45b0-aeeb-3ea442945c5c',
    email   = COALESCE(email, 'jrfisherr@gmail.com'),
    updated_at = now()
WHERE id = '7b50bf7f-53ef-4edc-b88c-fdb541878f7c';
