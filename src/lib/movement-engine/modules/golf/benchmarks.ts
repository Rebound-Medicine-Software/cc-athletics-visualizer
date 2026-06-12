export interface GolfBenchmark { key: string; label: string; min: number; max: number; unit?: string; }

export const GOLF_BENCHMARK_KEYS = [
  'lead_load_pct',
  'weight_transfer_pct',
  'tempo_ratio',
  'cop_efficiency',
  'peak_impact_force',
  'transition_ms',
];

export const GOLF_TARGET_BANDS: Record<string, { good: [number, number]; ok: [number, number] }> = {
  lead_load_pct:        { good: [75, 90], ok: [65, 95] },
  weight_transfer_pct:  { good: [20, 40], ok: [10, 55] },
  tempo_ratio:          { good: [2.5, 3.2], ok: [2.0, 3.8] },
  cop_efficiency:       { good: [70, 100], ok: [55, 100] },
  peak_impact_force:    { good: [1200, 2200], ok: [900, 2600] },
  transition_ms:        { good: [120, 220], ok: [80, 280] },
};

export type BenchmarkScope = 'club' | 'region' | 'country' | 'global' | 'golf_benchmark' | 'tour_benchmark';

export const GOLF_BENCHMARK_SCOPES: { id: BenchmarkScope; label: string; disabled?: boolean }[] = [
  { id: 'club',            label: 'Club' },
  { id: 'region',          label: 'Region' },
  { id: 'country',         label: 'Country' },
  { id: 'global',          label: 'Global' },
  { id: 'golf_benchmark',  label: 'Golf Benchmark' },
  { id: 'tour_benchmark',  label: 'Tour Benchmark', disabled: true },
];
