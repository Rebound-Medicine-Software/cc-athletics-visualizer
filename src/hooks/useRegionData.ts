import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RegionTestingData {
  "Team Name": string;
  country: string;
  region: string | null;
  address: string | null;
}

export const useRegionData = () => {
  return useQuery({
    queryKey: ['region-testing-data'],
    queryFn: async (): Promise<RegionTestingData[]> => {
      console.log('Fetching region testing data...');
      
      const { data, error } = await supabase
        .from('Region Testing')
        .select('*');

      if (error) {
        console.error('Error fetching region data:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} region records`);
      console.log('Region data:', data);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};