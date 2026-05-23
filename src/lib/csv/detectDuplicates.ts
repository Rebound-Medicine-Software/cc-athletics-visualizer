// Per-row duplicate detection against existing test_data (any source incl. API).

import { supabase } from '@/integrations/supabase/client';
import type { ParsedCsvRow } from './parseCsv';

const TOLERANCE = 0.01; // ±1%

const KEY_METRICS_BY_TYPE: Record<string, string[]> = {
  Jumps: ['jump_height', 'rsi', 'peak_force', 'peak_power'],
  Isometrics: ['force_peak', 'rfd_max', 'impulse_200ms'],
  Balance: ['stability_score', 'sway'],
  Movement: [],
};

export interface RowDuplicateStatus {
  index: number;
  isDuplicate: boolean;
  matchedTestDataId?: string;
  reason?: string;
}

export async function detectRowDuplicates(args: {
  athleteId: string;
  testType: string;
  testName: string;
  rows: ParsedCsvRow[];
  fallbackDate: string; // when row has no date
}): Promise<RowDuplicateStatus[]> {
  const { athleteId, testType, testName, rows, fallbackDate } = args;
  const keyMetrics = KEY_METRICS_BY_TYPE[testType] ?? [];

  // Collect candidate dates to constrain the query
  const dates = Array.from(
    new Set(rows.map((r) => r.testDate ?? fallbackDate).filter(Boolean)),
  ) as string[];

  if (dates.length === 0) return rows.map((_, i) => ({ index: i, isDuplicate: false }));

  const { data: existing, error } = await supabase
    .from('test_data')
    .select('id, test_date, test_name, repetition_number, metrics')
    .eq('athlete_id', athleteId)
    .eq('test_name', testName)
    .in('test_date', dates);

  if (error) {
    console.warn('detectRowDuplicates query failed', error);
    return rows.map((_, i) => ({ index: i, isDuplicate: false }));
  }

  return rows.map((row, i) => {
    const date = row.testDate ?? fallbackDate;
    const match = (existing ?? []).find((e: any) => {
      if (e.test_date !== date) return false;
      if (e.repetition_number !== row.repetitionNumber) return false;
      if (keyMetrics.length === 0) return true;
      // Require at least one key metric to match within tolerance
      return keyMetrics.some((k) => {
        const a = Number(row.metrics?.[k]);
        const b = Number(e.metrics?.[k]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        if (b === 0) return a === 0;
        return Math.abs(a - b) / Math.abs(b) <= TOLERANCE;
      });
    });
    return match
      ? { index: i, isDuplicate: true, matchedTestDataId: match.id, reason: 'matches existing row' }
      : { index: i, isDuplicate: false };
  });
}
