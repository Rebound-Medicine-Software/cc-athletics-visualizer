/**
 * valdToCCAthletics.ts
 * Maps VALD API responses (ValdTest / ValdTestDetail from useVald.ts)
 * to the CC Athletics TestData interface (src/types/forcePlateTypes.ts).
 *
 * Pure translation layer — does not touch vald-bridge or ValdReportHub.
 *
 * Usage:
 *   const ccTests  = valdTestsToTestData(valdTests, athlete);
 *   const ccDetail = valdTestToTestData(valdDetail, athlete);
 *   const merged   = mergeWithCCData(ccTests, valdTests, athlete);
 *
 * Unit conversions:
 *   Jump height  cm → ft  (VALD returns cm via ×100 scale factor)
 *   Force/power  N / W    (no change — both systems use SI)
 *   Time         kept as returned by edge function
 *   RSI          dimensionless
 */

import { TestData, JumpMetrics, IsometricMetrics, PogoMetrics } from '@/types/forcePlateTypes';
import { ValdAthlete, ValdTest, ValdTestDetail } from '@/hooks/useVald';

// ── Unit conversion ───────────────────────────────────────────────────────────

const CM_TO_FT = 0.0328084;

function cmToFt(cm: number | null | undefined): number | undefined {
  if (cm == null) return undefined;
  return Math.round(cm * CM_TO_FT * 100000) / 100000;
}

function orUndef(n: number | null | undefined): number | undefined {
  return n ?? undefined;
}

// ── Test type classification ──────────────────────────────────────────────────

export function classifyTestType(type: string): 'jump' | 'isometric' | 'pogo' {
  const t = type.toLowerCase();
  if (t.includes('pogo')) return 'pogo';
  if (
    t.includes('isometric') || t.includes('mvc')  || t.includes('imtp') ||
    t.includes('soleus')    || t.includes('gastroc') ||
    t.includes('copenhagen')|| t.includes('adductor')
  ) return 'isometric';
  return 'jump';
}

export function mapTestName(type: string): string {
  const t = type.toLowerCase().replace(/[\s_-]/g, '');
  if (t.includes('countermovement') || t === 'cmj') return 'Countermovement Jump';
  if (t.includes('dropjump')        || t === 'dj')  return 'Drop Jump';
  if (t.includes('squatjump')       || t === 'sj')  return 'Squat Jump';
  if (t.includes('pogojump') || t.includes('pogo')) return 'Pogo Jump';
  return type;
}

// ── Metric mappers ────────────────────────────────────────────────────────────

function toJumpMetrics(test: ValdTest | ValdTestDetail): JumpMetrics {
  const isDJ = test.type.toLowerCase().includes('drop');
  const heightCm = isDJ ? test.djH   : test.cmjH;
  const rsiVal   = isDJ ? test.djRSI : test.cmjRSI;
  const ctVal    = isDJ ? test.djCT  : null;

  const m: JumpMetrics = {
    jump_height_ft: cmToFt(heightCm),
    peak_power:     orUndef(test.cmjPP),
    rsi:            orUndef(rsiVal),
    contact_time:   orUndef(ctVal),
  };

  if ('raw' in test && test.raw) {
    const r = test.raw;
    m.peak_force          = r['PEAK_PROPULSIVE_FORCE_Both'] ?? r['PEAK_FORCE_Both'];
    m.avg_propulsive_force= r['AVG_PROPULSIVE_FORCE_Both'];
    m.avg_propulsive_power= r['AVG_PROPULSIVE_PWR_Both'];
    m.avg_braking_force   = r['AVG_BRAKING_FORCE_Both'] ?? r['PEAK_BRAKING_FORCE_Both'];
    m.avg_braking_power   = r['AVG_BRAKING_PWR_Both']   ?? r['PEAK_BRAKING_PWR_Both'];
    m.braking_duration    = r['BRAKING_DURATION_Both'];
    m.net_impulse         = r['NET_IMPULSE_Both'] ?? r['PROPULSIVE_IMPULSE_Both'];
    m.takeoff_velocity    = r['TAKEOFF_VELOCITY_Both'];
    m.peak_velocity       = r['PEAK_VELOCITY_Both'];
    m.avg_rfd             = r['AVG_RFD_Both'];
    m.time_to_peak_force  = r['TIME_TO_PEAK_FORCE_Both'];
    m.body_mass           = r['BODY_MASS_Both'] ?? r['BODY_WEIGHT_Both'];
    if (!m.contact_time)  m.contact_time = r['CONTRACTION_TIME_Both'];
  }
  return m;
}

function toIsometricMetrics(test: ValdTest | ValdTestDetail): IsometricMetrics {
  const m: IsometricMetrics = {};

  // Peak force from flat limb fields
  if ('solL' in test || 'solR' in test) {
    const d = test as ValdTestDetail;
    if (d.solL != null && d.solR != null) {
      m.force_peak = Math.round((d.solL + d.solR) / 2 * 100) / 100;
    } else {
      m.force_peak = d.solL ?? d.solR ?? undefined;
    }
  }

  // Time-window metrics from raw map
  if ('raw' in test && test.raw) {
    const r = test.raw;
    const fw = (key: string): number | undefined =>
      r[`${key}_Both`] ??
      (r[`${key}_Left`] != null && r[`${key}_Right`] != null
        ? Math.round((r[`${key}_Left`] + r[`${key}_Right`]) / 2 * 100) / 100
        : r[`${key}_Left`] ?? r[`${key}_Right`] ?? undefined);

    m.force_50ms  = fw('FORCE_50MS')  ?? fw('EARLY_FORCE_CAPACITY');
    m.force_100ms = fw('FORCE_100MS');
    m.force_150ms = fw('FORCE_150MS');
    m.force_200ms = fw('FORCE_200MS');
    m.force_250ms = fw('FORCE_250MS') ?? fw('MODERATE_LATE_FORCE');
    if (!m.force_peak) m.force_peak = fw('PEAK_FORCE') ?? fw('STABLE_FORCE_READING');

    m.rfd_max   = fw('PEAK_RFD') ?? fw('RFD_MAX');
    m.rfd_50ms  = fw('RFD_50MS');
    m.rfd_100ms = fw('RFD_100MS');
    m.rfd_150ms = fw('RFD_150MS');
    m.rfd_200ms = fw('RFD_200MS');
    m.rfd_250ms = fw('RFD_250MS');

    m.impulse_50ms  = fw('IMPULSE_50MS');
    m.impulse_100ms = fw('IMPULSE_100MS');
    m.impulse_150ms = fw('IMPULSE_150MS');
    m.impulse_200ms = fw('IMPULSE_200MS');
    m.impulse_250ms = fw('IMPULSE_250MS');
  }
  return m;
}

function toPogoMetrics(test: ValdTest | ValdTestDetail): PogoMetrics {
  const heightFt = cmToFt(test.pjH);
  const ct       = 'pjCT' in test ? orUndef((test as ValdTestDetail).pjCT) : undefined;
  const rsi      = orUndef(test.pjRSI);
  let ft: number | undefined;
  let power: number | undefined;
  if ('raw' in test && test.raw) {
    ft    = test.raw['FLIGHT_TIME_Both'];
    power = test.raw['PEAK_PROPULSIVE_PWR_Both'];
  }
  return {
    jump_height: heightFt, avg_jump_height: heightFt,
    contact_time: ct,      avg_contact_time: ct,
    flight_time: ft,       avg_flight_time: ft,
    avg_rsi: rsi,
    power, avg_power: power,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Convert one ValdTest or ValdTestDetail into a CC Athletics TestData record. */
export function valdTestToTestData(
  test: ValdTest | ValdTestDetail,
  athlete: ValdAthlete,
): TestData {
  const category = classifyTestType(test.type);
  const metrics =
    category === 'pogo'       ? toPogoMetrics(test) :
    category === 'isometric'  ? toIsometricMetrics(test) :
                                toJumpMetrics(test);
  return {
    athlete_id:        athlete.id,
    athlete_name:      athlete.name,
    team_name:         athlete.teams,
    test_date:         test.date,
    test_name:         mapTestName(test.type),
    repetition_number: 1,
    gender:            athlete.sex || undefined,
    metrics,
  };
}

/** Convert a ValdTest array into CC Athletics TestData[]. */
export function valdTestsToTestData(
  tests: ValdTest[],
  athlete: ValdAthlete,
): TestData[] {
  return tests.map(t => valdTestToTestData(t, athlete));
}

/**
 * Merge CC Athletics data with VALD data for the same athlete.
 * Result is sorted by date descending so the most recent test appears first
 * regardless of which system it came from.
 *
 * Example:
 *   const merged = mergeWithCCData(ccAthleteTests, valdTests, valdAthlete);
 *   // Pass merged into any existing CC Athletics chart/table component
 */
export function mergeWithCCData(
  ccData: TestData[],
  valdTests: ValdTest[],
  athlete: ValdAthlete,
): TestData[] {
  return [...ccData, ...valdTestsToTestData(valdTests, athlete)]
    .sort((a, b) => b.test_date.localeCompare(a.test_date));
}
