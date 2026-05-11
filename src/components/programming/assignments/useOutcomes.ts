import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OutcomeMetric {
  key: string;
  label: string;
  unit: string;
  testName: string;
  metricKeys: string[]; // first match wins
  higherIsBetter: boolean;
}

export const OUTCOME_METRICS: OutcomeMetric[] = [
  { key: 'cmj_jh', label: 'CMJ Jump Height', unit: 'cm', testName: 'Countermovement Jump', metricKeys: ['jump_height_ft', 'jump_height_ni'], higherIsBetter: true },
  { key: 'cmj_pp', label: 'CMJ Peak Power', unit: 'W', testName: 'Countermovement Jump', metricKeys: ['peak_power'], higherIsBetter: true },
  { key: 'cmj_rsi', label: 'CMJ RSI-modified', unit: '', testName: 'Countermovement Jump', metricKeys: ['rsi_modified', 'rsi'], higherIsBetter: true },
  { key: 'imtp_pf', label: 'IMTP Peak Force', unit: 'N', testName: 'Isometric Mid-Thigh Pull (IMTP)', metricKeys: ['force_peak'], higherIsBetter: true },
  { key: 'pogo_rsi', label: 'Pogo RSI', unit: '', testName: 'Pogo Jump', metricKeys: ['avg_rsi', 'rsi'], higherIsBetter: true },
];

export interface OutcomeRow {
  metric: OutcomeMetric;
  before: { date: string; value: number } | null;
  after: { date: string; value: number } | null;
  changeAbs: number | null;
  changePct: number | null;
  direction: 'up' | 'down' | 'flat' | null;
}

const pickFirst = (m: any, keys: string[]): number | null => {
  if (!m || typeof m !== 'object') return null;
  for (const k of keys) {
    const v = m[k];
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string' && v && !isNaN(Number(v))) return Number(v);
  }
  return null;
};

export const useAssignmentOutcomes = (params: {
  athleteId: string | null | undefined;
  startDate: string | null | undefined;
}) => {
  return useQuery({
    queryKey: ['assignment-outcomes', params.athleteId, params.startDate],
    enabled: !!params.athleteId && !!params.startDate,
    queryFn: async (): Promise<OutcomeRow[]> => {
      const testNames = Array.from(new Set(OUTCOME_METRICS.map((m) => m.testName)));
      const { data, error } = await supabase
        .from('test_data')
        .select('test_name, test_date, metrics')
        .eq('athlete_id', params.athleteId!)
        .in('test_name', testNames)
        .order('test_date', { ascending: false })
        .limit(500);
      if (error) throw error;

      const rows = data ?? [];
      const start = params.startDate!;

      return OUTCOME_METRICS.map<OutcomeRow>((metric) => {
        // For each date, average available reps for this metric
        const byDate: Record<string, { sum: number; n: number }> = {};
        rows
          .filter((r: any) => r.test_name === metric.testName)
          .forEach((r: any) => {
            const v = pickFirst(r.metrics, metric.metricKeys);
            if (v == null) return;
            const d = r.test_date as string;
            (byDate[d] = byDate[d] ?? { sum: 0, n: 0 });
            byDate[d].sum += v;
            byDate[d].n += 1;
          });

        const dated = Object.entries(byDate)
          .map(([date, { sum, n }]) => ({ date, value: sum / n }))
          .sort((a, b) => (a.date < b.date ? 1 : -1)); // desc

        const before = dated.find((d) => d.date < start) ?? null;
        const afterCandidates = dated.filter((d) => d.date >= start);
        const after = afterCandidates[0] ?? null; // most recent on/after start

        let changeAbs: number | null = null;
        let changePct: number | null = null;
        let direction: OutcomeRow['direction'] = null;
        if (before && after) {
          changeAbs = after.value - before.value;
          changePct = before.value !== 0 ? (changeAbs / Math.abs(before.value)) * 100 : null;
          direction = changeAbs > 0.0001 ? 'up' : changeAbs < -0.0001 ? 'down' : 'flat';
        }
        return { metric, before, after, changeAbs, changePct, direction };
      });
    },
  });
};
