
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CCAthletics } from '@/services/ccAthleticsApi';
import { DataProcessor } from '@/services/dataProcessor';
import { TestData } from '@/types/forcePlateTypes';
import { toast } from 'sonner';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceTeams } from '@/hooks/useWorkspaceTeams';

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
  const { teamId, isImpersonating } = useEffectiveTeamId();
  const { data: workspaceTeams } = useWorkspaceTeams();
  const isGlobalAdmin = profile?.role === 'super_admin' && !isImpersonating;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cc-athletics-data', apiKey, teamId ?? 'all', isImpersonating,
      (workspaceTeams ?? []).map((t) => t.id).sort().join(',')],
    queryFn: async () => {
      if (!apiKey) throw new Error('API key is required');

      const ccApi = new CCAthletics({ apiKey });
      const processor = new DataProcessor();

      const { teams, jumpAthletes, isometricAthletes, pogoAthletes } = await ccApi.getAllData();
      processor.setTeams(teams);

      const jumpData = processor.processJumpData(jumpAthletes);
      const isometricData = processor.processIsometricData(isometricAthletes);
      const pogoData = processor.processPogoData(pogoAthletes);
      const allData = [...jumpData, ...isometricData, ...pogoData];

      if (isGlobalAdmin) return allData;

      // Workspace = parent + every child CC team. Filter by name (CC payload
      // only carries names), but allowlist comes from the parent_team_id graph.
      const allowedNames = new Set(
        (workspaceTeams ?? []).map((t) => (t.name || '').toLowerCase()),
      );
      if (allowedNames.size === 0) return [];
      const filtered = allData.filter(
        (r: any) => allowedNames.has((r.team_name ?? '').toLowerCase()),
      );
      console.log(`Scoped CC Athletics data ${allData.length} → ${filtered.length} across ${allowedNames.size} workspace team(s)`);
      return filtered;
    },
    enabled: !!apiKey && (isGlobalAdmin || workspaceTeams !== undefined),
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
