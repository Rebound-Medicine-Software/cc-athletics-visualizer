
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestData } from '@/types/forcePlateTypes';

export const useSupabaseData = () => {
  return useQuery({
    queryKey: ['cc-athletics-live-data'],
    queryFn: async (): Promise<TestData[]> => {
      console.log('Fetching live data from CC Athletics API via Supabase Edge Function...');
      
      try {
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

        console.log(`Fetched ${data.data?.length || 0} test records from CC Athletics API`);
        
        if (data.data && data.data.length > 0) {
          console.log('Sample record:', {
            athlete_name: data.data[0].athlete_name,
            test_name: data.data[0].test_name,
            test_date: data.data[0].test_date,
            team_name: data.data[0].team_name,
            metrics_keys: data.data[0].metrics ? Object.keys(data.data[0].metrics) : []
          });
        }

        return data.data || [];
      } catch (error) {
        console.error('Error fetching live CC Athletics data:', error);
        throw error;
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for live updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
