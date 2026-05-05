import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { toast } from 'sonner';
import type { CompletionLogInput } from '../assignments/types';

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
      event_source: 'programming.client',
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

/* ---------------- Client assignments ---------------- */

export const useClientAssignments = (athleteId: string | null) => {
  return useQuery({
    queryKey: ['client-assignments', athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athlete_program_assignments')
        .select(
          `*,
           programming_templates:template_id ( id, name, description, goal, duration_weeks, is_published )`
        )
        .eq('athlete_id', athleteId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        template_name: row.programming_templates?.name ?? null,
      }));
    },
  });
};

export const useClientCompletionLogs = (assignmentId: string | null) => {
  return useQuery({
    queryKey: ['client-assignment-logs', assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programme_completion_logs')
        .select('*')
        .eq('assignment_id', assignmentId!)
        .order('performed_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
};

/* ---------------- Client log completion ---------------- */

export const useClientLogCompletion = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: CompletionLogInput & { athleteId: string; assignmentTeamId: string; assignmentAthleteId: string }
    ) => {
      // Defensive: ensure the assignment belongs to this client's athlete record.
      if (input.assignmentAthleteId !== input.athleteId) {
        throw new Error('You can only log completion for your own programme.');
      }
      const { data, error } = await supabase
        .from('programme_completion_logs')
        .insert({
          team_id: input.assignmentTeamId,
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
        teamId: input.assignmentTeamId,
        userId: user?.id ?? null,
        athleteId: input.athleteId,
        eventType: input.programmingSessionId && !input.programmingExerciseId
          ? 'programme_session_completed'
          : 'programme_client_completion_logged',
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
      qc.invalidateQueries({ queryKey: ['client-assignment-logs', vars.assignmentId] });
      toast.success('Session logged');
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to log session'),
  });
};
