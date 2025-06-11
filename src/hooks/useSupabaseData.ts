
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestData } from '@/types/forcePlateTypes';

export const useSupabaseData = () => {
  return useQuery({
    queryKey: ['supabase-test-data'],
    queryFn: async (): Promise<TestData[]> => {
      console.log('Fetching test data from Supabase...');
      
      try {
        const { data, error } = await supabase
          .from('test_data')
          .select(`
            *,
            athletes!inner(name, gender, age, height_cm, weight_kg),
            teams!inner(name)
          `)
          .order('test_date', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log(`Fetched ${data?.length || 0} test records from Supabase`);
        
        if (data && data.length > 0) {
          console.log('Sample record:', {
            athlete_name: data[0].athlete_name,
            test_name: data[0].test_name,
            test_date: data[0].test_date,
            team_name: data[0].team_name,
            metrics_keys: data[0].metrics ? Object.keys(data[0].metrics) : []
          });
        }

        // Transform the data to match our TestData interface
        const transformedData: TestData[] = (data || []).map(record => ({
          athlete_id: record.cc_athlete_id,
          athlete_name: record.athlete_name,
          team_name: record.team_name,
          test_date: record.test_date,
          test_name: record.test_name,
          repetition_number: record.repetition_number,
          metrics: (typeof record.metrics === 'object' && record.metrics !== null) 
            ? record.metrics as any 
            : {}
        }));

        return transformedData;
      } catch (error) {
        console.error('Error fetching Supabase data:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
