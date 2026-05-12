import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const DEFAULT_SPORT_SUGGESTIONS = [
  'MMA', 'BJJ', 'Wrestling', 'Kickboxing', 'Boxing',
  'Football', 'Rugby', 'Athletics',
  '100m', '200m', '400m', 'Hurdles', 'Long Jump', 'High Jump',
  'Sprint', 'Endurance', 'Strength', 'Rehab',
];

/**
 * Returns deduplicated sport/event suggestions for an org:
 * defaults + every sport already used by athletes in this team.
 * Case-insensitive dedupe; preserves first-seen casing.
 */
export const useAthleteSportsOptions = (teamId?: string | null) => {
  return useQuery({
    queryKey: ['athlete-sports-options', teamId ?? 'all'],
    queryFn: async (): Promise<string[]> => {
      let query = supabase.from('athletes').select('sports');
      if (teamId) query = query.eq('team_id', teamId);
      const { data, error } = await query;
      if (error) throw error;

      const seen = new Map<string, string>();
      for (const s of DEFAULT_SPORT_SUGGESTIONS) {
        seen.set(s.toLowerCase(), s);
      }
      (data ?? []).forEach((row: any) => {
        (row.sports ?? []).forEach((s: string) => {
          if (!s) return;
          const k = s.trim().toLowerCase();
          if (k && !seen.has(k)) seen.set(k, s.trim());
        });
      });
      return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 60 * 1000,
  });
};
