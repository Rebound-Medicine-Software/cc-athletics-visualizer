import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Backs the org admin "Submit for review" toggle (Settings > Review Workflow).
// teams.review_workflow_enabled was added by the 2026-09-11 migration (schema-only
// pass); this hook is the first thing to actually read/write it.
export const useReviewWorkflowEnabled = (teamId: string | null | undefined) => {
  return useQuery({
    queryKey: ['team-review-workflow-enabled', teamId],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
      .from('teams')
      .select('review_workflow_enabled')
      .eq('id', teamId!)
      .maybeSingle();
      if (error) throw error;
      return (data as any)?.review_workflow_enabled ?? false;
    },
  });
};

export const useUpdateReviewWorkflowEnabled = (teamId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!teamId) throw new Error('No team selected');
      const { error } = await supabase
      .from('teams')
      .update({ review_workflow_enabled: enabled } as any)
      .eq('id', teamId);
      if (error) throw error;
      return enabled;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-review-workflow-enabled', teamId] });
    },
  });
};
