import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Athlete {
  id: string;
  name: string;
  team: string;
  email: string;
  testing_dates: string;
}

/**
 * Returns athletes from the canonical `athletes` table.
 * Shape is normalised so existing consumers expecting
 * { id, name, team, email, testing_dates } keep working.
 *
 * - `team` is resolved via the joined `teams.name` (text).
 * - `testing_dates` is derived from `last_test_at` (timestamptz) — formatted as YYYY-MM-DD.
 */
export const useAthletes = () => {
  return useQuery({
    queryKey: ['athletes'],
    queryFn: async (): Promise<Athlete[]> => {
      console.log('Fetching athletes...');

      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, email, last_test_at, teams ( name )');

      if (error) {
        console.error('Error fetching athletes:', error);
        throw error;
      }

      const normalized: Athlete[] = (data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name ?? '',
        team: row.teams?.name ?? '',
        email: row.email ?? '',
        testing_dates: row.last_test_at
          ? new Date(row.last_test_at).toISOString().split('T')[0]
          : '',
      }));

      console.log(`Fetched ${normalized.length} athletes`);
      return normalized;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
