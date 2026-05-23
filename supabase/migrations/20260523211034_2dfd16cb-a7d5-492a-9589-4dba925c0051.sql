
-- Cleanup duplicates: keep the latest updated_at row per identity group
WITH ranked_ex AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY assignment_id, programming_exercise_id, programming_session_id, performed_on
    ORDER BY updated_at DESC, created_at DESC
  ) rn
  FROM programme_completion_logs
  WHERE programming_exercise_id IS NOT NULL
)
DELETE FROM programme_completion_logs WHERE id IN (SELECT id FROM ranked_ex WHERE rn > 1);

WITH ranked_sess AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY assignment_id, programming_session_id, performed_on
    ORDER BY updated_at DESC, created_at DESC
  ) rn
  FROM programme_completion_logs
  WHERE programming_exercise_id IS NULL AND programming_session_id IS NOT NULL
)
DELETE FROM programme_completion_logs WHERE id IN (SELECT id FROM ranked_sess WHERE rn > 1);

-- Partial unique indexes matching the app-level upsert lookup branches
CREATE UNIQUE INDEX IF NOT EXISTS pcl_unique_exercise_with_session
  ON public.programme_completion_logs (assignment_id, programming_exercise_id, programming_session_id, performed_on)
  WHERE programming_exercise_id IS NOT NULL AND programming_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pcl_unique_exercise_no_session
  ON public.programme_completion_logs (assignment_id, programming_exercise_id, performed_on)
  WHERE programming_exercise_id IS NOT NULL AND programming_session_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pcl_unique_session_only
  ON public.programme_completion_logs (assignment_id, programming_session_id, performed_on)
  WHERE programming_exercise_id IS NULL AND programming_session_id IS NOT NULL;
