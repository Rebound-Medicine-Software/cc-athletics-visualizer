import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestData } from '@/types/forcePlateTypes';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceTeams } from '@/hooks/useWorkspaceTeams';

/**
 * Live test data from CC Athletics API via the `fetch-cc-data` edge function.
 *
 * The edge function pulls all CC teams returned by the global API key. Because
 * one Organisation workspace can own MULTIPLE CC teams (modelled as
 * teams.parent_team_id → workspace_team), we client-side restrict the rows
 * to every team belonging to the caller's workspace:
 *
 * - Normal users: workspace team + all child CC teams (matched by team name).
 * - Super admin (no impersonation): unfiltered (global view).
 * - Super admin actively impersonating: workspace team + children of the
 *   impersonated organisation.
 */
export const useSupabaseData = () => {
  const { profile } = useAuth();
  const { teamId, isImpersonating } = useEffectiveTeamId();
  const { data: workspaceTeams } = useWorkspaceTeams();
  const isGlobalAdmin = profile?.role === 'super_admin' && !isImpersonating;

  return useQuery({
    queryKey: [
      'cc-athletics-live-data',
      teamId ?? 'all',
      isImpersonating,
      (workspaceTeams ?? []).map((t) => t.id).sort().join(','),
    ],
    queryFn: async (): Promise<TestData[]> => {
      const { data, error } = await supabase.functions.invoke('fetch-cc-data', {
        method: 'GET',
      });

      if (error) throw new Error(`Failed to fetch data: ${error.message}`);
      if (!data?.success) throw new Error(data?.error ?? 'Unknown error');

      const rows: TestData[] = data.data || [];
      console.log(`Fetched ${rows.length} test records from CC Athletics API`);

      // Global super-admin view: no client-side filter.
      if (isGlobalAdmin) return rows;

      // Restrict to every team in the caller's workspace (parent + children).
      const allowedNames = new Set(
        (workspaceTeams ?? []).map((t) => (t.name || '').toLowerCase()),
      );
      if (allowedNames.size === 0) return [];

      const filtered = rows.filter((r: any) =>
        allowedNames.has((r.team_name ?? '').toLowerCase()),
      );
      console.log(
        `Scoped CC data ${rows.length} → ${filtered.length} across ${allowedNames.size} workspace team(s)`,
      );
      return filtered;
    },
    enabled: isGlobalAdmin || (workspaceTeams !== undefined),
    refetchInterval: 10 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
