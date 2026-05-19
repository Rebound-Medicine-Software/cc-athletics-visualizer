import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
};

/* ---------------- Client log completion (upsert) ---------------- */

export const useClientLogCompletion = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: CompletionLogInput & { athleteId: string; assignmentTeamId: string; assignmentAthleteId: string }
    ) => {
      if (input.assignmentAthleteId !== input.athleteId) {
        throw new Error('You can only log completion for your own programme.');
      }

      // Find an existing log for this assignment/exercise|session/date to update.
      let query = supabase
        .from('programme_completion_logs')
        .select('id')
        .eq('assignment_id', input.assignmentId)
        .eq('performed_on', input.performedOn);

      if (input.programmingExerciseId) {
        query = query.eq('programming_exercise_id', input.programmingExerciseId);
      } else {
        query = query.is('programming_exercise_id', null);
      }
      if (input.programmingSessionId) {
        query = query.eq('programming_session_id', input.programmingSessionId);
      } else {
        query = query.is('programming_session_id', null);
      }

      const { data: existing, error: findErr } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;

      const payload = {
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
      };

      let resultId: string | null = null;
      let wasUpdate = false;
      if (existing?.id) {
        const { data, error } = await supabase
          .from('programme_completion_logs')
          .update(payload)
          .eq('id', existing.id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        resultId = data?.id ?? existing.id;
        wasUpdate = true;
      } else {
        const { data, error } = await supabase
          .from('programme_completion_logs')
          .insert(payload)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        resultId = data?.id ?? null;
      }

      await logActivity({
        teamId: input.assignmentTeamId,
        userId: user?.id ?? null,
        athleteId: input.athleteId,
        eventType: input.programmingSessionId && !input.programmingExerciseId
          ? (wasUpdate ? 'programme_session_feedback_updated' : 'programme_session_completed')
          : (wasUpdate ? 'programme_client_completion_updated' : 'programme_client_completion_logged'),
        metadata: {
          assignment_id: input.assignmentId,
          programming_exercise_id: input.programmingExerciseId ?? null,
          programming_session_id: input.programmingSessionId ?? null,
          performed_on: input.performedOn,
          log_id: resultId,
        },
      });
      return { id: resultId, updated: wasUpdate };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['client-assignment-logs', vars.assignmentId] });
      toast.success(res?.updated ? 'Feedback updated' : 'Saved');
    },
    onError: (err: any) => toast.error(err?.message ?? 'Failed to save. Try again.'),
  });
};
