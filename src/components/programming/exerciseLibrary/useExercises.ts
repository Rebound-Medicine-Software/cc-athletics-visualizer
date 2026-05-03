import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Exercise, ExerciseFormValues } from './types';

const splitCsv = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const logActivity = async (params: {
  teamId: string;
  userId: string | null;
  eventType: string;
  exerciseId: string;
  exerciseName: string;
}) => {
  try {
    await supabase.from('platform_activity_logs').insert({
      event_type: params.eventType,
      event_source: 'programming.exercise_library',
      team_id: params.teamId,
      user_id: params.userId,
      severity: 'info',
      metadata: { exercise_id: params.exerciseId, exercise_name: params.exerciseName },
    });
  } catch {
    // non-fatal
  }
};

export const useExercises = (filters: {
  search: string;
  category: string;
  equipment: string;
  showArchived: boolean;
}) => {
  const { teamId } = useEffectiveTeamId();
  return useQuery({
    queryKey: ['exercises', teamId, filters],
    enabled: !!teamId,
    queryFn: async (): Promise<Exercise[]> => {
      let q = supabase
        .from('exercises')
        .select('*')
        .eq('team_id', teamId!)
        .order('name', { ascending: true });
      if (!filters.showArchived) q = q.eq('is_archived', false);
      if (filters.search.trim()) q = q.ilike('name', `%${filters.search.trim()}%`);
      if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category);
      if (filters.equipment && filters.equipment !== 'all')
        q = q.contains('equipment', [filters.equipment]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
  });
};

export const useExerciseFacets = () => {
  const { teamId } = useEffectiveTeamId();
  return useQuery({
    queryKey: ['exercises-facets', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('category, equipment')
        .eq('team_id', teamId!)
        .eq('is_archived', false);
      if (error) throw error;
      const cats = new Set<string>();
      const eq = new Set<string>();
      (data ?? []).forEach((row: any) => {
        if (row.category) cats.add(row.category);
        (row.equipment ?? []).forEach((e: string) => eq.add(e));
      });
      return {
        categories: Array.from(cats).sort(),
        equipment: Array.from(eq).sort(),
      };
    },
  });
};

const buildPayload = (v: ExerciseFormValues) => ({
  name: v.name.trim(),
  category: v.category.trim() || null,
  primary_muscles: splitCsv(v.primary_muscles),
  equipment: splitCsv(v.equipment),
  video_url: v.video_url.trim() || null,
  instructions: v.instructions.trim() || null,
});

export const useCreateExercise = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      if (!teamId) throw new Error('No team context');
      const payload = {
        ...buildPayload(values),
        team_id: teamId,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('exercises')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'exercise.created',
        exerciseId: data.id,
        exerciseName: data.name,
      });
      return data as Exercise;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-facets'] });
      toast.success('Exercise created');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to create exercise'),
  });
};

export const useUpdateExercise = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ExerciseFormValues }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update({ ...buildPayload(values), updated_by: user?.id ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (teamId) {
        await logActivity({
          teamId,
          userId: user?.id ?? null,
          eventType: 'exercise.updated',
          exerciseId: data.id,
          exerciseName: data.name,
        });
      }
      return data as Exercise;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-facets'] });
      toast.success('Exercise updated');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update exercise'),
  });
};

export const useToggleArchiveExercise = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (ex: Exercise) => {
      const next = !ex.is_archived;
      const { data, error } = await supabase
        .from('exercises')
        .update({ is_archived: next, updated_by: user?.id ?? null })
        .eq('id', ex.id)
        .select()
        .single();
      if (error) throw error;
      if (teamId) {
        await logActivity({
          teamId,
          userId: user?.id ?? null,
          eventType: next ? 'exercise.archived' : 'exercise.unarchived',
          exerciseId: ex.id,
          exerciseName: ex.name,
        });
      }
      return data as Exercise;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      toast.success(data.is_archived ? 'Exercise archived' : 'Exercise restored');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update exercise'),
  });
};
