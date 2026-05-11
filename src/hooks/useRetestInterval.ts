import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const DEFAULT_RETEST_INTERVAL_DAYS = 42;
export const MIN_RETEST_INTERVAL_DAYS = 7;
export const MAX_RETEST_INTERVAL_DAYS = 365;

export const useRetestInterval = (teamId: string | null | undefined) => {
  return useQuery({
    queryKey: ['team-retest-interval', teamId],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('teams')
        .select('retest_interval_days')
        .eq('id', teamId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.retest_interval_days ?? DEFAULT_RETEST_INTERVAL_DAYS;
    },
  });
};

export const useUpdateRetestInterval = (teamId: string | null | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (days: number) => {
      if (!teamId) throw new Error('No team selected');
      if (days < MIN_RETEST_INTERVAL_DAYS || days > MAX_RETEST_INTERVAL_DAYS) {
        throw new Error(`Interval must be between ${MIN_RETEST_INTERVAL_DAYS} and ${MAX_RETEST_INTERVAL_DAYS} days`);
      }
      const { error } = await supabase
        .from('teams')
        .update({ retest_interval_days: days } as any)
        .eq('id', teamId);
      if (error) throw error;
      return days;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-retest-interval', teamId] });
    },
  });
};
