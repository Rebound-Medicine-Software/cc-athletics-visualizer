
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CCAthletics } from '@/services/ccAthleticsApi';
import { DataProcessor } from '@/services/dataProcessor';
import { TestData } from '@/types/forcePlateTypes';
import { toast } from 'sonner';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UseCCAthletics {
  data: TestData[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  setApiKey: (apiKey: string) => void;
  apiKey: string | null;
}

export const useCCAthletics = (): UseCCAthletics => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const { profile } = useAuth();
  const { teamId, isImpersonating, impersonatedTeamName } = useEffectiveTeamId();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cc-athletics-data', apiKey, teamId ?? 'all', isImpersonating],
    queryFn: async () => {
      if (!apiKey) {
        throw new Error('API key is required');
      }

      const ccApi = new CCAthletics({ apiKey });
      const processor = new DataProcessor();

      console.log('Fetching CC Athletics data...', { teamId, isImpersonating });
      const { teams, jumpAthletes, isometricAthletes, pogoAthletes } = await ccApi.getAllData();

      processor.setTeams(teams);

      const jumpData = processor.processJumpData(jumpAthletes);
      const isometricData = processor.processIsometricData(isometricAthletes);
      const pogoData = processor.processPogoData(pogoAthletes);

      const allData = [...jumpData, ...isometricData, ...pogoData];
      console.log(`Processed ${allData.length} test records`);

      // Resolve effective team name and apply post-fetch scoping.
      // The upstream CC Athletics API has no per-tenant scoping, so we
      // restrict client-side to the relevant team_name.
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
        const filtered = allData.filter(
          (r: any) => (r.team_name ?? '').toLowerCase() === effectiveTeamName!.toLowerCase(),
        );
        console.log(`Scoped CC Athletics data ${allData.length} → ${filtered.length} for "${effectiveTeamName}"`);
        return filtered;
      }

      return allData;
    },
    enabled: !!apiKey,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const setApiKey = (newApiKey: string) => {
    setApiKeyState(newApiKey);
    // Store in localStorage for persistence
    localStorage.setItem('cc-athletics-api-key', newApiKey);
  };

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('cc-athletics-api-key');
    if (storedApiKey) {
      setApiKeyState(storedApiKey);
    }
  }, []);

  // Show toast notifications for errors
  useEffect(() => {
    if (error) {
      toast.error(`Data fetch failed: ${error.message}`);
    }
  }, [error]);

  return {
    data: data || null,
    isLoading,
    error: error?.message || null,
    refetch,
    setApiKey,
    apiKey,
  };
};
