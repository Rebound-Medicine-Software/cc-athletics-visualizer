import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Rows awaiting the org admin's approve/reject decision (Section 4 Item 1's
// Submit-for-review queue, framework.md). Only ever non-empty for a team once
// someone has used the Submit for review button added to
// PerformanceDataExplorer.tsx in PR #64.
export interface PendingReviewRow {
  id: string;
  athlete_name: string;
  test_name: string;
  test_date: string;
}

export const usePendingReviewQueue = (teamId: string | null | undefined) => {
  return useQuery({
    queryKey: ['review-queue:pending', teamId],
    enabled: !!teamId,
    staleTime: 30_000,
    queryFn: async (): Promise<PendingReviewRow[]> => {
      const { data, error } = await supabase
        .from('test_data')
        .select('id, athlete_name, test_name, test_date')
        .eq('team_id', teamId!)
        .eq('review_status', 'pending' as any)
        .order('test_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as any as PendingReviewRow[];
    },
  });
};

interface DecisionInput {
  id: string;
  decision: 'approved' | 'rejected';
  athleteName: string;
  testName: string;
  testDate: string;
}

// Approving just flips review_status - the result was already visible to the
// practitioner and starts showing on the athlete-facing progress view once
// that filtering lands (still open, see framework.md). Rejecting also fires
// an in-app notification: test_data has no submitted_by column, so this
// notifies everyone on the team who can act on it rather than just the
// original submitter - see supabase/functions/notify-review-decision.
export const useReviewDecision = (teamId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, athleteName, testName, testDate }: DecisionInput) => {
      const { error } = await supabase
        .from('test_data')
        .update({ review_status: decision } as any)
        .eq('id', id);
      if (error) throw error;

      if (decision === 'rejected' && teamId) {
        try {
          await supabase.functions.invoke('notify-review-decision', {
            body: { teamId, athleteName, testName, testDate, action: 'rejected' },
          });
        } catch (e) {
          console.error('notify-review-decision failed', e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-queue:pending', teamId] });
      qc.invalidateQueries({ queryKey: ['perf-explorer:tests'] });
    },
  });
};
