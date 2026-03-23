
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TestData } from '@/types/forcePlateTypes';

// Temporary dummy data used as fallback when no live data is available
const generateDummyData = (): TestData[] => {
  const now = new Date();
  const athletes = [
    { name: 'James Wilson', gender: 'male' },
    { name: 'Sarah Mitchell', gender: 'female' },
    { name: 'Liam O\'Brien', gender: 'male' },
    { name: 'Emma Clarke', gender: 'female' },
    { name: 'Noah Patel', gender: 'male' },
    { name: 'Olivia Chen', gender: 'female' },
    { name: 'Ethan Brooks', gender: 'male' },
    { name: 'Ava Thompson', gender: 'female' },
  ];

  const tests: TestData[] = [];

  athletes.forEach((athlete, i) => {
    const hoursAgo = Math.floor(Math.random() * 48);
    const testDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

    // CMJ
    tests.push({
      athlete_id: `dummy-${i}`,
      athlete_name: athlete.name,
      team_name: 'Evolve Physiotherapy',
      test_date: testDate,
      test_name: 'Countermovement Jump',
      repetition_number: 1,
      gender: athlete.gender,
      metrics: {
        jump_height_ft: +(25 + Math.random() * 20).toFixed(1),
        peak_power: +(2800 + Math.random() * 1500).toFixed(0),
        peak_velocity: +(2.5 + Math.random() * 0.8).toFixed(2),
        flight_time: +(0.4 + Math.random() * 0.15).toFixed(3),
        contact_time: +(0.6 + Math.random() * 0.3).toFixed(3),
        rsi: +(0.5 + Math.random() * 0.8).toFixed(2),
        avg_propulsive_power: +(1800 + Math.random() * 1000).toFixed(0),
        avg_rfd: +(5000 + Math.random() * 4000).toFixed(0),
        body_mass: +(60 + Math.random() * 30).toFixed(1),
        net_impulse: +(180 + Math.random() * 80).toFixed(1),
      },
    });

    // Squat Jump
    tests.push({
      athlete_id: `dummy-${i}`,
      athlete_name: athlete.name,
      team_name: 'Evolve Physiotherapy',
      test_date: testDate,
      test_name: 'Squat Jump',
      repetition_number: 1,
      gender: athlete.gender,
      metrics: {
        jump_height_ft: +(22 + Math.random() * 18).toFixed(1),
        peak_power: +(2500 + Math.random() * 1400).toFixed(0),
        peak_velocity: +(2.3 + Math.random() * 0.7).toFixed(2),
        flight_time: +(0.38 + Math.random() * 0.12).toFixed(3),
        body_mass: +(60 + Math.random() * 30).toFixed(1),
      },
    });

    // Drop Jump
    tests.push({
      athlete_id: `dummy-${i}`,
      athlete_name: athlete.name,
      team_name: 'Evolve Physiotherapy',
      test_date: testDate,
      test_name: 'Drop Jump',
      repetition_number: 1,
      gender: athlete.gender,
      metrics: {
        jump_height_ft: +(20 + Math.random() * 15).toFixed(1),
        contact_time: +(0.15 + Math.random() * 0.1).toFixed(3),
        flight_time: +(0.35 + Math.random() * 0.15).toFixed(3),
        rsi: +(1.2 + Math.random() * 1.0).toFixed(2),
        peak_power: +(3000 + Math.random() * 1500).toFixed(0),
      },
    });

    // Pogo Jump
    tests.push({
      athlete_id: `dummy-${i}`,
      athlete_name: athlete.name,
      team_name: 'Evolve Physiotherapy',
      test_date: testDate,
      test_name: 'Pogo Jump',
      repetition_number: 1,
      gender: athlete.gender,
      metrics: {
        jump_height: +(12 + Math.random() * 8).toFixed(1),
        contact_time: +(0.12 + Math.random() * 0.06).toFixed(3),
        flight_time: +(0.28 + Math.random() * 0.1).toFixed(3),
        power: +(1500 + Math.random() * 800).toFixed(0),
      },
    });

    // Left/Right Side CMJ
    ['Left Side', 'Right Side'].forEach(side => {
      tests.push({
        athlete_id: `dummy-${i}`,
        athlete_name: athlete.name,
        team_name: 'Evolve Physiotherapy',
        test_date: testDate,
        test_name: `${side} Countermovement Jump`,
        repetition_number: 1,
        gender: athlete.gender,
        leg_stance: side === 'Left Side' ? 'left_leg' : 'right_leg',
        metrics: {
          jump_height_ft: +(15 + Math.random() * 12).toFixed(1),
          peak_power: +(1800 + Math.random() * 900).toFixed(0),
          peak_velocity: +(2.0 + Math.random() * 0.6).toFixed(2),
          flight_time: +(0.32 + Math.random() * 0.1).toFixed(3),
        },
      });
    });
  });

  return tests;
};

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
          // Fall back to dummy data instead of throwing
          console.log('⚠️ Using temporary dummy data (edge function error)');
          return generateDummyData();
        }

        if (!data.success) {
          console.error('CC Athletics API error:', data.error);
          console.log('⚠️ Using temporary dummy data (API error)');
          return generateDummyData();
        }

        console.log(`Fetched ${data.data?.length || 0} test records from CC Athletics API`);
        
        // If real data exists, use it; otherwise fall back to dummy data
        if (data.data && data.data.length > 0) {
          console.log('✅ Using live CC Athletics data');
          console.log('Sample record:', {
            athlete_name: data.data[0].athlete_name,
            test_name: data.data[0].test_name,
            test_date: data.data[0].test_date,
            team_name: data.data[0].team_name,
            metrics_keys: data.data[0].metrics ? Object.keys(data.data[0].metrics) : []
          });
          return data.data;
        }

        console.log('⚠️ Using temporary dummy data (no records returned)');
        return generateDummyData();
      } catch (error) {
        console.error('Error fetching live CC Athletics data:', error);
        console.log('⚠️ Using temporary dummy data (catch fallback)');
        return generateDummyData();
      }
    },
    refetchInterval: 10 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
