
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestData } from '@/types/forcePlateTypes';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Live test data from CC Athletics API via the `fetch-cc-data` edge function.
 *
 * The edge function pulls all teams from the upstream CC Athletics API
 * (it has no per-tenant scoping). To enforce per-organisation visibility,
 * we client-side filter the resulting rows by `team_name` matching the
 * caller's effective team name:
 *
 * - Normal users: filtered to their own team's name.
 * - Super admin (no impersonation): unfiltered (global view in Control Centre).
 * - Super admin actively impersonating: filtered to the impersonated
 *   organisation's name (read-only View-As).
 */
export const useSupabaseData = () => {
  const { profile } = useAuth();
  const { teamId, isImpersonating, impersonatedTeamName } = useEffectiveTeamId();

  return useQuery({
    queryKey: ['cc-athletics-live-data', teamId ?? 'all', isImpersonating],
    queryFn: async (): Promise<TestData[]> => {
      console.log('Fetching live data from CC Athletics API via Supabase Edge Function...', {
        teamId, isImpersonating,
      });

      const { data, error } = await supabase.functions.invoke('fetch-cc-data', {
        method: 'GET',
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`Failed to fetch data: ${error.message}`);
      }

      if (!data.success) {
        console.error('CC Athletics API error:', data.error);
        throw new Error(data.error);
      }

      const rows: TestData[] = data.data || [];
      console.log(`Fetched ${rows.length} test records from CC Athletics API`);

      // Resolve the effective team name to filter by.
      // - View-As: impersonated team name from context
      // - Normal user: their own team's name (lookup if needed via profile.team_id)
      // - Super admin not impersonating: no filter (global view)
      let effectiveTeamName: string | null = null;

      if (isImpersonating && impersonatedTeamName) {
        effectiveTeamName = impersonatedTeamName;
      } else if (profile?.role !== 'super_admin' && teamId) {
        const { data: teamRow } = await supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .maybeSingle();
        effectiveTeamName = teamRow?.name ?? null;
      }

      if (effectiveTeamName) {
        const before = rows.length;
        const filtered = rows.filter(
          (r: any) => (r.team_name ?? '').toLowerCase() === effectiveTeamName!.toLowerCase(),
        );
        console.log(`Scoped CC data ${before} → ${filtered.length} for team "${effectiveTeamName}"`);
        return filtered;
      }

      return rows;
    },
    refetchInterval: 10 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
