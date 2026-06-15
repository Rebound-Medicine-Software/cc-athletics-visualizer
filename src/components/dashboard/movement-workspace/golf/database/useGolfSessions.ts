import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GolfSessionRow {
  id: string;
  athlete_id: string | null;
  athlete_name: string | null;
  team_id: string | null;
  test_date: string;
  original_file_name: string | null;
  created_at: string;
}

export function useGolfSessions(athleteId?: string | null) {
  return useQuery({
    queryKey: ['golf-sessions', athleteId ?? 'all'],
    enabled: !!athleteId,
    queryFn: async (): Promise<GolfSessionRow[]> => {
      let q = supabase
        .from('test_data')
        .select('id, athlete_id, athlete_name, team_id, test_date, original_file_name, created_at')
        .eq('test_type', 'movement')
        .eq('test_subtype', 'golf_swing')
        .order('test_date', { ascending: false });
      if (athleteId) q = q.eq('athlete_id', athleteId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GolfSessionRow[];
    },
    staleTime: 30_000,
  });
}
