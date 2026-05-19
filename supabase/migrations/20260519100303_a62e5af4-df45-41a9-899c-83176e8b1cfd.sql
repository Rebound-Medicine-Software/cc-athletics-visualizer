
-- Allow athlete clients to read the template content (blocks, sessions, exercises, exercise library)
-- that belongs to programmes assigned to them. Practitioner team policies are unchanged.

CREATE OR REPLACE FUNCTION public.client_can_view_assignment_template(_template_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.athlete_program_assignments apa
    JOIN public.athletes a ON a.id = apa.athlete_id
    WHERE apa.template_id = _template_id
      AND a.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.client_can_view_assignment_block(_block_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.programming_blocks b
    JOIN public.athlete_program_assignments apa ON apa.template_id = b.template_id
    JOIN public.athletes a ON a.id = apa.athlete_id
    WHERE b.id = _block_id
      AND a.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.client_can_view_library_exercise(_exercise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.programming_exercises pe
    JOIN public.programming_blocks b ON b.id = pe.block_id
    JOIN public.athlete_program_assignments apa ON apa.template_id = b.template_id
    JOIN public.athletes a ON a.id = apa.athlete_id
    WHERE pe.exercise_id = _exercise_id
      AND a.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "client can view assigned templates" ON public.programming_templates;
CREATE POLICY "client can view assigned templates"
  ON public.programming_templates FOR SELECT
  TO authenticated
  USING (public.client_can_view_assignment_template(id));

DROP POLICY IF EXISTS "client can view assigned blocks" ON public.programming_blocks;
CREATE POLICY "client can view assigned blocks"
  ON public.programming_blocks FOR SELECT
  TO authenticated
  USING (public.client_can_view_assignment_template(template_id));

DROP POLICY IF EXISTS "client can view assigned sessions" ON public.programming_sessions;
CREATE POLICY "client can view assigned sessions"
  ON public.programming_sessions FOR SELECT
  TO authenticated
  USING (public.client_can_view_assignment_block(block_id));

DROP POLICY IF EXISTS "client can view assigned exercises" ON public.programming_exercises;
CREATE POLICY "client can view assigned exercises"
  ON public.programming_exercises FOR SELECT
  TO authenticated
  USING (public.client_can_view_assignment_block(block_id));

DROP POLICY IF EXISTS "client can view assigned library exercises" ON public.exercises;
CREATE POLICY "client can view assigned library exercises"
  ON public.exercises FOR SELECT
  TO authenticated
  USING (public.client_can_view_library_exercise(id));
