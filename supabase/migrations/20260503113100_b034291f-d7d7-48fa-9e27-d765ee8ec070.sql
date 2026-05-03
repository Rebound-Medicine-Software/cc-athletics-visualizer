
-- ============================================================================
-- 0. Updated-at trigger fn
-- ============================================================================
CREATE OR REPLACE FUNCTION public.programming_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================================
-- 1. Tables (created in dependency order, no policies/triggers yet)
-- ============================================================================
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  primary_muscles text[] NOT NULL DEFAULT '{}',
  equipment text[] NOT NULL DEFAULT '{}',
  video_url text,
  instructions text,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.programming_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  goal text,
  duration_weeks integer,
  is_published boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.programming_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.programming_templates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  week_number integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.programming_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.programming_blocks(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  sets integer,
  reps text,
  load text,
  tempo text,
  rest_seconds integer,
  rpe numeric(3,1),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.athlete_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.programming_templates(id) ON DELETE RESTRICT,
  assigned_by uuid,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','cancelled')),
  override_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.programme_completion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES public.athlete_program_assignments(id) ON DELETE CASCADE,
  programming_exercise_id uuid REFERENCES public.programming_exercises(id) ON DELETE SET NULL,
  performed_on date NOT NULL DEFAULT CURRENT_DATE,
  sets_completed integer,
  reps_completed text,
  load_used text,
  rpe numeric(3,1),
  notes text,
  logged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
CREATE INDEX idx_exercises_team_id ON public.exercises(team_id);
CREATE INDEX idx_exercises_team_active ON public.exercises(team_id) WHERE is_archived = false;

CREATE INDEX idx_prog_templates_team_id ON public.programming_templates(team_id);
CREATE INDEX idx_prog_templates_team_published ON public.programming_templates(team_id, is_published);

CREATE INDEX idx_prog_blocks_template_id ON public.programming_blocks(template_id);
CREATE INDEX idx_prog_blocks_template_position ON public.programming_blocks(template_id, position);

CREATE INDEX idx_prog_exercises_block_id ON public.programming_exercises(block_id);
CREATE INDEX idx_prog_exercises_block_position ON public.programming_exercises(block_id, position);
CREATE INDEX idx_prog_exercises_exercise_id ON public.programming_exercises(exercise_id);

CREATE INDEX idx_apa_team_id ON public.athlete_program_assignments(team_id);
CREATE INDEX idx_apa_athlete_id ON public.athlete_program_assignments(athlete_id);
CREATE INDEX idx_apa_template_id ON public.athlete_program_assignments(template_id);
CREATE INDEX idx_apa_status ON public.athlete_program_assignments(status);
CREATE INDEX idx_apa_start_date ON public.athlete_program_assignments(start_date);
CREATE INDEX idx_apa_team_status ON public.athlete_program_assignments(team_id, status);

CREATE INDEX idx_pcl_team_id ON public.programme_completion_logs(team_id);
CREATE INDEX idx_pcl_assignment_id ON public.programme_completion_logs(assignment_id);
CREATE INDEX idx_pcl_performed_on ON public.programme_completion_logs(performed_on);
CREATE INDEX idx_pcl_assignment_performed ON public.programme_completion_logs(assignment_id, performed_on);

-- ============================================================================
-- 3. updated_at triggers
-- ============================================================================
CREATE TRIGGER trg_exercises_updated_at BEFORE UPDATE ON public.exercises
FOR EACH ROW EXECUTE FUNCTION public.programming_set_updated_at();
CREATE TRIGGER trg_prog_templates_updated_at BEFORE UPDATE ON public.programming_templates
FOR EACH ROW EXECUTE FUNCTION public.programming_set_updated_at();
CREATE TRIGGER trg_prog_blocks_updated_at BEFORE UPDATE ON public.programming_blocks
FOR EACH ROW EXECUTE FUNCTION public.programming_set_updated_at();
CREATE TRIGGER trg_prog_exercises_updated_at BEFORE UPDATE ON public.programming_exercises
FOR EACH ROW EXECUTE FUNCTION public.programming_set_updated_at();
CREATE TRIGGER trg_apa_updated_at BEFORE UPDATE ON public.athlete_program_assignments
FOR EACH ROW EXECUTE FUNCTION public.programming_set_updated_at();
CREATE TRIGGER trg_pcl_updated_at BEFORE UPDATE ON public.programme_completion_logs
FOR EACH ROW EXECUTE FUNCTION public.programming_set_updated_at();

-- ============================================================================
-- 4. SECURITY DEFINER access helpers (now safe — tables exist)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_programming_template(_template_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.programming_templates t
    WHERE t.id = _template_id
      AND (can_access_team_row(t.team_id) OR is_super_admin() OR auth.role() = 'service_role')
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_programming_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_programming_template(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_programming_block(_block_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.programming_blocks b
    JOIN public.programming_templates t ON t.id = b.template_id
    WHERE b.id = _block_id
      AND (can_access_team_row(t.team_id) OR is_super_admin() OR auth.role() = 'service_role')
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_programming_block(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_programming_block(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_program_assignment(_assignment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_program_assignments a
    WHERE a.id = _assignment_id
      AND (can_access_team_row(a.team_id) OR is_super_admin() OR auth.role() = 'service_role')
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_program_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_program_assignment(uuid) TO authenticated;

-- ============================================================================
-- 5. RLS enable + policies
-- ============================================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_completion_logs ENABLE ROW LEVEL SECURITY;

-- exercises
CREATE POLICY "service role exercises" ON public.exercises FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "super admins manage exercises" ON public.exercises FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "team can manage exercises" ON public.exercises FOR ALL
  USING (can_access_team_row(team_id)) WITH CHECK (can_access_team_row(team_id));

-- programming_templates
CREATE POLICY "service role programming_templates" ON public.programming_templates FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "super admins manage programming_templates" ON public.programming_templates FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "team can manage programming_templates" ON public.programming_templates FOR ALL
  USING (can_access_team_row(team_id)) WITH CHECK (can_access_team_row(team_id));

-- programming_blocks
CREATE POLICY "service role programming_blocks" ON public.programming_blocks FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "super admins manage programming_blocks" ON public.programming_blocks FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "team can manage programming_blocks" ON public.programming_blocks FOR ALL
  USING (can_access_programming_template(template_id))
  WITH CHECK (can_access_programming_template(template_id));

-- programming_exercises
CREATE POLICY "service role programming_exercises" ON public.programming_exercises FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "super admins manage programming_exercises" ON public.programming_exercises FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "team can manage programming_exercises" ON public.programming_exercises FOR ALL
  USING (can_access_programming_block(block_id))
  WITH CHECK (can_access_programming_block(block_id));

-- athlete_program_assignments
CREATE POLICY "service role apa" ON public.athlete_program_assignments FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "super admins manage apa" ON public.athlete_program_assignments FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "team can manage apa" ON public.athlete_program_assignments FOR ALL
  USING (can_access_team_row(team_id)) WITH CHECK (can_access_team_row(team_id));

-- programme_completion_logs
CREATE POLICY "service role pcl" ON public.programme_completion_logs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "super admins manage pcl" ON public.programme_completion_logs FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "team can manage pcl" ON public.programme_completion_logs FOR ALL
  USING (can_access_team_row(team_id)) WITH CHECK (can_access_team_row(team_id));
