
-- 1. Sessions table
CREATE TABLE IF NOT EXISTS public.programming_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.programming_blocks(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Session',
  day_offset integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programming_sessions_block ON public.programming_sessions(block_id);
CREATE INDEX IF NOT EXISTS idx_programming_sessions_day ON public.programming_sessions(block_id, day_offset);

CREATE TRIGGER trg_programming_sessions_updated_at
BEFORE UPDATE ON public.programming_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.programming_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role programming_sessions"
ON public.programming_sessions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "super admins manage programming_sessions"
ON public.programming_sessions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "team can manage programming_sessions"
ON public.programming_sessions FOR ALL
USING (can_access_programming_block(block_id))
WITH CHECK (can_access_programming_block(block_id));

-- 2. Link exercises to optional session
ALTER TABLE public.programming_exercises
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.programming_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_programming_exercises_session ON public.programming_exercises(session_id);

-- 3. Link completion logs to optional session
ALTER TABLE public.programme_completion_logs
  ADD COLUMN IF NOT EXISTS programming_session_id uuid REFERENCES public.programming_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pcl_session ON public.programme_completion_logs(programming_session_id);
