import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import type { TraceSample } from './phaseEngine';

export interface RawTraceResult {
  samples: TraceSample[];
  columns: string[];
  sampleRate: number | null;
  hasLeftRight: boolean;
  rawCsv: string;
}

/** Picks the most likely raw CSV path from a metrics object (or row). */
export const pickRawCsvPath = (metrics: any): string | null => {
  if (!metrics || typeof metrics !== 'object') return null;
  return (
    metrics.raw_csv_path ??
    metrics.path_to_this_jump_raw_csv ??
    metrics.path_to_raw_csv ??
    null
  );
};

const numCol = (row: Record<string, any>, keys: string[]): number | null => {
  for (const k of keys) {
    if (row[k] === undefined || row[k] === null || row[k] === '') continue;
    const n = Number(row[k]);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

/** Calls the secure edge function to retrieve and parse a raw force-trace CSV. */
export const fetchRawTrace = async (
  path: string,
  opts: { downsampleFactor?: number; bodyMassKg?: number; samplingFrequency?: number } = {},
): Promise<RawTraceResult> => {
  const { data, error } = await supabase.functions.invoke('cc-raw-csv', {
    body: { path, downsample_factor: opts.downsampleFactor },
  });
  if (error) throw new Error(error.message || 'cc-raw-csv invocation failed');
  if (!data?.success) throw new Error(data?.error || 'cc-raw-csv failed');

  const csv: string = data.csv;
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
  });

  const rows = (parsed.data ?? []).filter((r) => r && Object.keys(r).length);
  const cols = (parsed.meta.fields ?? []) as string[];

  const tKeys = ['time', 't', 'time_s', 'time_sec', 'time_seconds', 'timestamp'];
  const leftKeys = ['fz_left', 'force_left', 'left', 'plate1', 'fp1', 'left_n'];
  const rightKeys = ['fz_right', 'force_right', 'right', 'plate2', 'fp2', 'right_n'];
  const totalKeys = ['fz', 'force', 'force_n', 'force_total', 'total', 'sum_force', 'fz_total'];

  const hasLeftRight =
    cols.some((c) => leftKeys.includes(c)) && cols.some((c) => rightKeys.includes(c));

  const sampleRate =
    opts.samplingFrequency && Number.isFinite(opts.samplingFrequency)
      ? Number(opts.samplingFrequency)
      : (() => {
          // Try to infer from time column
          const t0 = numCol(rows[0] ?? {}, tKeys);
          const t1 = numCol(rows[1] ?? {}, tKeys);
          if (t0 !== null && t1 !== null && t1 > t0) return Math.round(1 / (t1 - t0));
          return 1000;
        })();

  const samples: TraceSample[] = [];
  rows.forEach((r, i) => {
    const t = numCol(r, tKeys);
    const tSec = t !== null ? t : i / (sampleRate || 1000);
    const left = numCol(r, leftKeys);
    const right = numCol(r, rightKeys);
    const total = numCol(r, totalKeys);
    let f: number | null = total;
    if (f === null && (left !== null || right !== null)) f = (left ?? 0) + (right ?? 0);
    if (f === null) return;
    samples.push({ t: tSec, f: Math.abs(f) });
  });

  return { samples, columns: cols, sampleRate, hasLeftRight, rawCsv: csv };
};
