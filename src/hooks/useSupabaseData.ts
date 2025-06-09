
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestData, JumpMetrics, IsometricMetrics, PogoMetrics } from '@/types/forcePlateTypes';
import { toast } from 'sonner';

export interface UseSupabaseData {
  data: TestData[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  syncData: () => void;
  lastSyncTime: Date | null;
}

export const useSupabaseData = (): UseSupabaseData => {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['supabase-test-data'],
    queryFn: async () => {
      console.log('Fetching test data from Supabase...');
      
      const { data: testData, error } = await supabase
        .from('test_data')
        .select(`
          *,
          athletes:athlete_id (
            name,
            cc_athlete_id
          )
        `)
        .order('test_date', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw new Error(`Failed to fetch data: ${error.message}`);
      }

      console.log(`Fetched ${testData?.length || 0} test records from Supabase`);
      console.log('Sample record:', testData?.[0]);
      
      // Transform the data to match the expected TestData interface
      const transformedData: TestData[] = testData?.map(record => ({
        athlete_id: record.cc_athlete_id,
        athlete_name: record.athlete_name,
        team_name: record.team_name,
        test_date: record.test_date,
        test_name: record.test_name,
        repetition_number: record.repetition_number,
        metrics: record.metrics as JumpMetrics | IsometricMetrics | PogoMetrics,
      })) || [];

      return transformedData;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
  });

  const syncData = async () => {
    try {
      console.log('Starting data synchronization...');
      toast.info('Starting data synchronization...');
      
      const { data: result, error } = await supabase.functions.invoke('sync-cc-athletics');
      
      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      console.log('Sync result:', result);

      if (result?.success) {
        setLastSyncTime(new Date());
        toast.success(`Data sync completed! ${result.stats?.testRecords || 0} test records synchronized.`);
        refetch(); // Refresh the local data
      } else {
        throw new Error(result?.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message}`);
    }
  };

  // Load last sync time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('last-sync-time');
    if (stored) {
      setLastSyncTime(new Date(stored));
    }
  }, []);

  // Store sync time when it changes
  useEffect(() => {
    if (lastSyncTime) {
      localStorage.setItem('last-sync-time', lastSyncTime.toISOString());
    }
  }, [lastSyncTime]);

  return {
    data: data || null,
    isLoading,
    error: error?.message || null,
    refetch,
    syncData,
    lastSyncTime,
  };
};
