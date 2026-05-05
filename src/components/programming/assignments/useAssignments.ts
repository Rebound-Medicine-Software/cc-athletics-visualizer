import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  Assignment,
  AssignmentRow,
  AssignmentStatus,
  ExerciseOverride,
  CompletionLogInput,
} from './types';

const logActivity = async (params: {
  teamId: string | null;
  userId: string | null;
  athleteId?: string | null;
  eventType: string;
  metadata?: Record<string, any>;
}) => {
  if (!params.teamId) return;
  try {
    await supabase.from('platform_activity_logs').insert({
      event_type: params.eventType,
      event_source: 'programming.assignments',
      team_id: params.teamId,
      user_id: params.userId,
      athlete_id: params.athleteId ?? null,
      severity: 'info',
      metadata: params.metadata ?? {},
    });
  } catch {
    /* non-fatal */
  }
};

/* ---------------- List assignments ---------------- */

export const useAssignments = (filters: {
  athleteId: string;
  status: string;
}) => {
  const { teamId } = useEffectiveTeamId();
  return useQuery({
    queryKey: ['programme-assignments', teamId, filters],
    enabled: !!teamId,
    queryFn: async (): Promise<AssignmentRow[]> => {
      let q = supabase
        .from('athlete_program_assignments')
        .select(
          `*,
           athletes:athlete_id ( id, name ),
           programming_templates:template_id ( id, name, is_published )`
        )
        .eq('team_id', teamId!)
        .order('updated_at', { ascending: false });

      if (filters.athleteId && filters.athleteId !== 'all') {
        q = q.eq('athlete_id', filters.athleteId);
      }
      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        athlete_name: row.athletes?.name ?? null,
        template_name: row.programming_templates?.name ?? null,
        template_published: !!row.programming_templates?.is_published,
      })) as AssignmentRow[];
    },
  });
};

export const useAssignment = (id: string | null) => {
  return useQuery({
    queryKey: ['programme-assignment', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_program_assignments')
        .select(
          `*,
           athletes:athlete_id ( id, name, email, avatar_url ),
           programming_templates:template_id ( id, name, description, goal, duration_weeks, is_published )`
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
};

/* ---------------- Athletes (lookup) ---------------- */

export const useTeamAthletes = () => {
  const { teamId } = useEffectiveTeamId();
  return useQuery({
    queryKey: ['team-athletes-for-assignments', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, email')
        .eq('team_id', teamId!)
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const usePublishedTemplates = () => {
  const { teamId } = useEffectiveTeamId();
  return useQuery({
    queryKey: ['published-templates', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programming_templates')
        .select('id, name, goal, duration_weeks')
        .eq('team_id', teamId!)
        .eq('is_published', true)
        .is('archived_at', null)
        .order('name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

/* ---------------- Template structure (read-only) ---------------- */

export const useTemplateStructure = (templateId: string | null) => {
  return useQuery({
    queryKey: ['template-structure', templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data: blocks, error: bErr } = await supabase
        .from('programming_blocks')
        .select('*')
        .eq('template_id', templateId!)
        .order('position', { ascending: true });
      if (bErr) throw bErr;

      const blockIds = (blocks ?? []).map((b) => b.id);
      let exercises: any[] = [];
      let sessions: any[] = [];
      let library: Record<string, any> = {};
      if (blockIds.length) {
        const [{ data: ex, error: eErr }, { data: ss, error: sErr }] = await Promise.all([
          supabase.from('programming_exercises').select('*').in('block_id', blockIds).order('position', { ascending: true }),
          supabase.from('programming_sessions').select('*').in('block_id', blockIds).order('position', { ascending: true }),
        ]);
        if (eErr) throw eErr;
        if (sErr) throw sErr;
        exercises = ex ?? [];
        sessions = ss ?? [];

        const exIds = exercises.map((e) => e.exercise_id).filter(Boolean);
        if (exIds.length) {
          const { data: lib } = await supabase
            .from('exercises')
            .select('id, name, category')
            .in('id', exIds);
          library = Object.fromEntries((lib ?? []).map((x) => [x.id, x]));
        }
      }
      return { blocks: blocks ?? [], exercises, sessions, library };
    },
  });
};

/* ---------------- Completion logs ---------------- */

export const useCompletionSummary = (assignmentId: string | null) => {
  return useQuery({
    queryKey: ['assignment-completion', assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programme_completion_logs')
        .select('id, performed_on, programming_exercise_id, programming_session_id, sets_completed, reps_completed, load_used, rpe, notes, logged_by, created_at')
        .eq('assignment_id', assignmentId!)
        .order('performed_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
};

/* ---------------- Mutations ---------------- */

export const useCreateAssignments = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      templateId: string;
      athleteIds: string[];
      startDate: string;
      endDate: string | null;
    }) => {
      if (!teamId) throw new Error('No team');
      if (!input.athleteIds.length) throw new Error('Select at least one athlete');

      const rows = input.athleteIds.map((aid) => ({
        team_id: teamId,
        template_id: input.templateId,
        athlete_id: aid,
        assigned_by: user?.id ?? null,
        start_date: input.startDate,
        end_date: input.endDate,
        status: 'active' as AssignmentStatus,
      }));

      const { data, error } = await supabase
        .from('athlete_program_assignments')
        .insert(rows)
        .select('id, athlete_id');
      if (error) throw error;

      await Promise.all(
        (data ?? []).map((r) =>
          logActivity({
            teamId,
            userId: user?.id ?? null,
            athleteId: r.athlete_id,
            eventType: 'programme_assigned',
            metadata: {
              assignment_id: r.id,
              template_id: input.templateId,
              start_date: input.startDate,
              end_date: input.endDate,
            },
          })
        )
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme-assignments'] });
      toast.success('Programme assigned');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to assign programme'),
  });
};

export const useUpdateAssignmentStatus = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; status: AssignmentStatus; athleteId?: string }) => {
      const { error } = await supabase
        .from('athlete_program_assignments')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        athleteId: input.athleteId,
        eventType: 'programme_assignment_status_changed',
        metadata: { assignment_id: input.id, status: input.status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme-assignments'] });
      qc.invalidateQueries({ queryKey: ['programme-assignment'] });
      toast.success('Status updated');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to update status'),
  });
};

export const useUpdateAssignmentDates = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; startDate: string; endDate: string | null }) => {
      const { error } = await supabase
        .from('athlete_program_assignments')
        .update({
          start_date: input.startDate,
          end_date: input.endDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programme_assignment_updated',
        metadata: { assignment_id: input.id, start_date: input.startDate, end_date: input.endDate },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programme-assignments'] });
      qc.invalidateQueries({ queryKey: ['programme-assignment'] });
      toast.success('Dates updated');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to update dates'),
  });
};

/* ---------------- Overrides ---------------- */

export const useUpdateAssignmentOverrides = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      athleteId?: string | null;
      overridePayload: Record<string, ExerciseOverride>;
    }) => {
      const { error } = await supabase
        .from('athlete_program_assignments')
        .update({
          override_payload: input.overridePayload as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        athleteId: input.athleteId ?? null,
        eventType: 'programme_assignment_overrides_updated',
        metadata: {
          assignment_id: input.id,
          override_count: Object.keys(input.overridePayload ?? {}).length,
        },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['programme-assignments'] });
      qc.invalidateQueries({ queryKey: ['programme-assignment', vars.id] });
      toast.success('Overrides saved');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to save overrides'),
  });
};

/* ---------------- Completion logging ---------------- */

export const useLogCompletion = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CompletionLogInput & { athleteId?: string | null }) => {
      if (!teamId) throw new Error('No effective team');
      const { data, error } = await supabase
        .from('programme_completion_logs')
        .insert({
          team_id: teamId,
          assignment_id: input.assignmentId,
          programming_exercise_id: input.programmingExerciseId ?? null,
          programming_session_id: input.programmingSessionId ?? null,
          performed_on: input.performedOn,
          sets_completed: input.setsCompleted ?? null,
          reps_completed: input.repsCompleted ?? null,
          load_used: input.loadUsed ?? null,
          rpe: input.rpe ?? null,
          notes: input.notes ?? null,
          logged_by: user?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        athleteId: input.athleteId ?? null,
        eventType: input.programmingSessionId && !input.programmingExerciseId
          ? 'programme_session_completed'
          : 'programme_completion_logged',
        metadata: {
          assignment_id: input.assignmentId,
          programming_exercise_id: input.programmingExerciseId ?? null,
          programming_session_id: input.programmingSessionId ?? null,
          performed_on: input.performedOn,
          log_id: data?.id ?? null,
        },
      });
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['assignment-completion', vars.assignmentId] });
      toast.success('Session logged');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to log session'),
  });
};

export const useDeleteCompletionLog = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; assignmentId: string }) => {
      const { error } = await supabase
        .from('programme_completion_logs')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programme_completion_log_deleted',
        metadata: { log_id: input.id, assignment_id: input.assignmentId },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['assignment-completion', vars.assignmentId] });
      toast.success('Log removed');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to remove log'),
  });
};
