import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';

export interface WorkspaceTeam {
  id: string;
  name: string;
  cc_team_id: string | null;
  parent_team_id: string | null;
}

/**
 * Resolves the full set of teams visible to the current user's workspace:
 * - the workspace (parent) team itself
 * - every child team where parent_team_id = workspace team id
 *
 * Super admins not impersonating get an empty list (= no client-side filter,
 * meaning global view of whatever the data hook returns).
 */
export const useWorkspaceTeams = () => {
  const { profile } = useAuth();
  const { teamId, isImpersonating } = useEffectiveTeamId();
  const isGlobalAdmin = profile?.role === 'super_admin' && !isImpersonating;

  return useQuery({
    queryKey: ['workspace-teams', teamId, isGlobalAdmin],
    enabled: !!teamId || isGlobalAdmin,
    queryFn: async (): Promise<WorkspaceTeam[]> => {
      if (isGlobalAdmin) return [];
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, cc_team_id, parent_team_id')
        .or(`id.eq.${teamId},parent_team_id.eq.${teamId}`);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
};
