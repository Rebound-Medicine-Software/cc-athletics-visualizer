import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { canonicalSport } from '@/lib/sports/normalize';

export interface EliteBenchmarkRow {
  sport: string;
  cmj_jump_height_cm: number | null;
  cmj_peak_power_w: number | null;
  cmj_relative_peak_power_w_per_kg: number | null;
  imtp_peak_force_n: number | null;
  imtp_relative_peak_force_n_per_kg: number | null;
  sample_size: number;
}

/**
 * Returns aggregated elite reference values for the athlete's tagged sports.
 * Uses average across matching elite_athlete_data rows.
 *
 * Falls back to an empty array (UI hides the section) when no rows match.
 */
export const useEliteBenchmarkForAthlete = (sports: string[] | null | undefined) => {
  const canonical = Array.from(
    new Set((sports ?? []).map(canonicalSport).filter(Boolean)),
  );
  return useQuery({
    queryKey: ['elite-benchmark-for-athlete', canonical.sort().join('|')],
    enabled: canonical.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EliteBenchmarkRow[]> => {
      const { data, error } = await supabase
        .from('elite_athlete_data')
        .select(
          'sport, cmj_jump_height_cm, cmj_peak_power_w, cmj_relative_peak_power_w_per_kg, imtp_peak_force_n, imtp_relative_peak_force_n_per_kg',
        );
      if (error) throw error;

      const lower = (s: string) => s.trim().toLowerCase();
      const wanted = new Set(canonical.map(lower));
      const matched = (data ?? []).filter((r: any) =>
        r.sport && wanted.has(lower(canonicalSport(r.sport))),
      );

      const grouped = new Map<string, any[]>();
      for (const r of matched) {
        const k = canonicalSport(r.sport);
        const arr = grouped.get(k) ?? [];
        arr.push(r);
        grouped.set(k, arr);
      }

      const avg = (rows: any[], key: string): number | null => {
        const vals = rows.map((r) => Number(r[key])).filter((n) => Number.isFinite(n));
        if (!vals.length) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      };

      return Array.from(grouped.entries()).map(([sport, rows]) => ({
        sport,
        cmj_jump_height_cm: avg(rows, 'cmj_jump_height_cm'),
        cmj_peak_power_w: avg(rows, 'cmj_peak_power_w'),
        cmj_relative_peak_power_w_per_kg: avg(rows, 'cmj_relative_peak_power_w_per_kg'),
        imtp_peak_force_n: avg(rows, 'imtp_peak_force_n'),
        imtp_relative_peak_force_n_per_kg: avg(rows, 'imtp_relative_peak_force_n_per_kg'),
        sample_size: rows.length,
      }));
    },
  });
};
