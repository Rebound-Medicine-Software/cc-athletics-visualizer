import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Legacy-shaped interface preserved so existing dashboard consumers
 * (EliteComparison, charts, filters) keep working without changes.
 *
 * Source of truth is now the canonical snake_case table
 * `public.elite_athlete_data`. We map snake_case columns back to the
 * quoted/spaced legacy keys at read time.
 */
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
  dynamic_metrics?: any;
  created_at: string;
}

export const useEliteAthleteData = () => {
  return useQuery({
    queryKey: ['elite-athlete-data'],
    queryFn: async (): Promise<EliteAthleteData[]> => {
      console.log('Fetching elite athlete data from canonical table...');

      const { data, error } = await supabase
        .from('elite_athlete_data')
        .select('*');

      if (error) {
        console.error('Error fetching elite athlete data:', error);
        throw error;
      }

      const mapped: EliteAthleteData[] = (data ?? []).map((row: any) => ({
        id: row.id,
        "Team Name": row.team_name ?? '',
        "Athlete Name": row.athlete_name ?? '',
        "Sex": row.sex ?? '',
        "Sport": row.sport ?? '',
        "Age Group": row.age_group ?? 0,
        "Weight Category (kg)": row.weight_category ?? '',
        "CMJ Jump Height (cm)": row.cmj_jump_height_cm,
        "CMJ Peak Power (W)": row.cmj_peak_power_w,
        "CMJ Relative Peak Power (W/kg)": row.cmj_relative_peak_power_w_per_kg,
        "CMJ Reactive Strength Index": row.cmj_reactive_strength_index,
        "IMTP Peak Force (N)": row.imtp_peak_force_n,
        "IMTP Relative Peak Force (N/kg)": row.imtp_relative_peak_force_n_per_kg,
        dynamic_metrics: row.dynamic_metrics ?? {},
        created_at: row.created_at,
      }));

      console.log(`Fetched ${mapped.length} elite athlete records`);
      return mapped;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
