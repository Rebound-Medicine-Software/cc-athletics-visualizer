// Header → canonical metric name mapping.
// Permissive: unknown headers are preserved under metrics._raw.

import type { TestType } from './testTypeConfig';

/** Normalise a header for matching: lowercase, strip units, strip non-alphanumerics. */
export function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Canonical metric aliases keyed by test type family. */
const ALIASES: Record<TestType, Record<string, string>> = {
  Jumps: {
    jump_height: 'jump_height',
    jump_height_cm: 'jump_height',
    height: 'jump_height',
    rsi: 'rsi',
    reactive_strength_index: 'rsi',
    rsi_modified: 'rsi_modified',
    rsi_mod: 'rsi_modified',
    contact_time: 'contact_time',
    ground_contact_time: 'contact_time',
    flight_time: 'flight_time',
    peak_force: 'peak_force',
    peak_power: 'peak_power',
    avg_power: 'avg_power',
    takeoff_velocity: 'takeoff_velocity',
    velocity_at_takeoff: 'takeoff_velocity',
    braking_force: 'braking_force',
    propulsive_force: 'propulsive_force',
    left_contribution: 'left_contribution',
    right_contribution: 'right_contribution',
    left_peak_force: 'left_peak_force',
    right_peak_force: 'right_peak_force',
    repetition: 'repetition_number',
    rep: 'repetition_number',
    trial: 'repetition_number',
    trial_number: 'repetition_number',
    date: 'test_date',
    test_date: 'test_date',
    timestamp: 'test_date',
  },
  Isometrics: {
    peak_force: 'force_peak',
    force_peak: 'force_peak',
    force_50ms: 'force_50ms',
    force_100ms: 'force_100ms',
    force_150ms: 'force_150ms',
    force_200ms: 'force_200ms',
    force_250ms: 'force_250ms',
    rfd_max: 'rfd_max',
    max_rfd: 'rfd_max',
    rfd_50ms: 'rfd_50ms',
    rfd_100ms: 'rfd_100ms',
    rfd_150ms: 'rfd_150ms',
    rfd_200ms: 'rfd_200ms',
    impulse: 'impulse_200ms',
    impulse_50ms: 'impulse_50ms',
    impulse_100ms: 'impulse_100ms',
    impulse_150ms: 'impulse_150ms',
    impulse_200ms: 'impulse_200ms',
    impulse_250ms: 'impulse_250ms',
    left_force: 'left_force',
    right_force: 'right_force',
    trial: 'repetition_number',
    trial_number: 'repetition_number',
    rep: 'repetition_number',
    date: 'test_date',
    test_date: 'test_date',
    timestamp: 'test_date',
  },
  Balance: {
    sway: 'sway',
    stability_score: 'stability_score',
    stability: 'stability_score',
    left_balance: 'left_balance',
    right_balance: 'right_balance',
    date: 'test_date',
    test_date: 'test_date',
    timestamp: 'test_date',
  },
  Movement: {
    date: 'test_date',
    test_date: 'test_date',
    timestamp: 'test_date',
    trial: 'repetition_number',
    rep: 'repetition_number',
  },
};

/** Map a parsed row to canonical metrics + meta. */
export function mapRowToMetrics(
  row: Record<string, string | number | null>,
  testType: TestType,
): { metrics: Record<string, any>; testDate?: string; repetition?: number } {
  const aliasMap = ALIASES[testType];
  const metrics: Record<string, any> = {};
  const raw: Record<string, any> = {};
  let testDate: string | undefined;
  let repetition: number | undefined;

  for (const [origKey, rawValue] of Object.entries(row)) {
    const key = normaliseHeader(origKey);
    const canonical = aliasMap[key];
    const value = coerceValue(rawValue);

    if (canonical === 'test_date') {
      testDate = parseDate(rawValue);
      continue;
    }
    if (canonical === 'repetition_number') {
      const n = Number(value);
      if (Number.isFinite(n)) repetition = Math.trunc(n);
      continue;
    }
    if (canonical) {
      metrics[canonical] = value;
    } else {
      raw[origKey] = value;
      // Also surface as a top-level normalized key so Explorer/metric pickers can find it.
      // Don't overwrite a canonical key if one already exists.
      if (key && metrics[key] === undefined) {
        metrics[key] = value;
      }
    }
  }

  if (Object.keys(raw).length > 0) metrics._raw = raw;
  return { metrics, testDate, repetition };
}

function coerceValue(v: string | number | null): any {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '') return null;
  // Strip trailing unit suffix like "12.3 cm"
  const m = s.match(/^(-?\d+(?:\.\d+)?)/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

function parseDate(v: string | number | null): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const d = new Date(v as any);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
}
