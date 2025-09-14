import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Athlete {
  id: string;
  name: string;
  team: string;
  email: string;
  testing_dates: string;
}

export const useAthletes = () => {
  return useQuery({
    queryKey: ['athletes'],
    queryFn: async (): Promise<Athlete[]> => {
      console.log('Fetching athletes...');
      
      const { data, error } = await supabase
        .from('athletes_new')
        .select('*');

      if (error) {
        console.error('Error fetching athletes:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} athletes`);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};