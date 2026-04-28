import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';

interface RegionTestingData {
  "Team Name": string;
  country: string;
  region: string | null;
  address: string | null;
  logo: string | null;
}

/**
 * Region Testing rows are publicly readable (cross-tenant geographic
 * benchmark dataset). For View-As impersonation we still scope the
 * returned rows to the impersonated organisation's row(s) so the
 * Region Comparison view reflects the impersonated team's perspective.
 *
 * - Super admin (no impersonation): unscoped (global map data).
 * - Super admin View-As: filtered to the impersonated team name.
 * - Normal user: unscoped (existing behaviour — region map is global).
 */
export const useRegionData = () => {
  const { profile } = useAuth();
  const { isImpersonating, impersonatedTeamName } = useEffectiveTeamId();

  return useQuery({
    queryKey: ['region-testing-data', isImpersonating ? impersonatedTeamName : 'all'],
    queryFn: async (): Promise<RegionTestingData[]> => {
      console.log('Fetching region testing data...', { isImpersonating, impersonatedTeamName });

      let query = supabase.from('Region Testing').select('*');

      if (isImpersonating && impersonatedTeamName && profile?.role === 'super_admin') {
        query = query.eq('Team Name', impersonatedTeamName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching region data:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} region records`);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
