import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EliteAthleteData {
  id: string;
  "Team Name": string;
  "Athlete Name": string;
  "Sex": string;
  "Sport": string;
  "Age Group": number;
  "Weight Category (kg)": string;
  "CMJ Jump Height (cm)": number | null;
  "CMJ Peak Power (W)": number | null;
  "CMJ Relative Peak Power (W/kg)": number | null;
  "CMJ Reactive Strength Index": string | null;
  "IMTP Peak Force (N)": number | null;
  "IMTP Relative Peak Force (N/kg)": number | null;
  created_at: string;
}

export const useEliteAthleteData = () => {
  return useQuery({
    queryKey: ['elite-athlete-data'],
    queryFn: async (): Promise<EliteAthleteData[]> => {
      console.log('Fetching elite athlete data...');
      
      const { data, error } = await supabase
        .from('Elite Athlete Data')
        .select('*');

      if (error) {
        console.error('Error fetching elite athlete data:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} elite athlete records`);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};