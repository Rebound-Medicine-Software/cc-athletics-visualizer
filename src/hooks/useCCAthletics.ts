
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CCAthletics } from '@/services/ccAthleticsApi';
import { DataProcessor } from '@/services/dataProcessor';
import { TestData } from '@/types/forcePlateTypes';
import { toast } from 'sonner';

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cc-athletics-data', apiKey],
    queryFn: async () => {
      if (!apiKey) {
        throw new Error('API key is required');
      }

      const ccApi = new CCAthletics({ apiKey });
      const processor = new DataProcessor();

      console.log('Fetching CC Athletics data...');
      const { teams, jumpAthletes, isometricAthletes, pogoAthletes } = await ccApi.getAllData();
      
      processor.setTeams(teams);
      
      const jumpData = processor.processJumpData(jumpAthletes);
      const isometricData = processor.processIsometricData(isometricAthletes);
      const pogoData = processor.processPogoData(pogoAthletes);

      const allData = [...jumpData, ...isometricData, ...pogoData];
      console.log(`Processed ${allData.length} test records`);
      
      return allData;
    },
    enabled: !!apiKey,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for live updates
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
