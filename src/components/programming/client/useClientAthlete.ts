import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';

/**
 * Resolves the athlete record for the currently logged-in client.
 *
 * Mapping strategy: athletes.email = profile.email AND team_id = profile.team_id.
 * RLS on `athletes` (can_access_team_row) enforces team boundary as a second line of defence.
 *
 * Returns the first match (athletes table allows duplicates by design but a client
 * is expected to have a single record per team).
 */
export const useClientAthlete = () => {
  const { profile } = useAuth();
  const { teamId } = useEffectiveTeamId();
  const email = profile?.email ?? null;

  return useQuery({
    queryKey: ['client-athlete', teamId, email],
    enabled: !!teamId && !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, email, team_id, avatar_url')
        .eq('team_id', teamId!)
        .ilike('email', email!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};
