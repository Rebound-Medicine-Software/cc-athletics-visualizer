import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';

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
 *
 * Scoping:
 * - When a super admin is actively impersonating, results are explicitly
 *   filtered to the impersonated team_id (defense-in-depth on top of RLS).
 * - When a normal user, RLS already restricts to their team; we still
 *   apply the explicit filter when teamId is available for clarity.
 */
export const useAthletes = () => {
  const { teamId, isImpersonating } = useEffectiveTeamId();

  return useQuery({
    queryKey: ['athletes', teamId ?? 'all', isImpersonating],
    queryFn: async (): Promise<Athlete[]> => {
      console.log('Fetching athletes...', { teamId, isImpersonating });

      let query = supabase
        .from('athletes')
        .select('id, name, email, last_test_at, team_id, teams ( name )');

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

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
