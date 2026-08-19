/**
 * valdToCCAthletics.ts
 * Maps VALD API responses (ValdTest / ValdTestDetail from useVald.ts)
 * to the CC Athletics TestData interface (src/types/forcePlateTypes.ts).
 *
 * Pure translation layer — does not touch vald-bridge or ValdReportHub.
 *
 * Two output flavours exist because the dashboard and the PDF generator
 * expect different units for the same metric keys:
 *
 *   valdTestsToTestData()   → dashboard shape
 *                             jump height in ft (jump_height_ft) + cm (jump_height_cm)
 *                             contact / flight time in milliseconds
 *
 *   valdTestsToReportData() → generate-force-plate-report shape
 *                             jump height in metres (the function ×100 → cm)
 *                             contact / flight time in seconds (the function ×1000 → ms)
 *
 * Left / Right limb values are mapped onto the same keys the CC Athletics
 * limb-symmetry logic uses (p1_avg_force / p2_avg_force,
 * fp1_peak_landing_force / fp2_peak_landing_force, force_peak_left /
 * force_peak_right, avg_fp1_contribution / avg_fp2_contribution).
 */

import { TestData, JumpMetrics, IsometricMetrics, PogoMetrics } from '@/types/forcePlateTypes';
import { ValdAthlete, ValdTest, ValdTestDetail } from '@/hooks/useVald';

// ── Unit conversion ───────────────────────────────────────────────────────────

const CM_TO_FT = 0.0328084;

function round(n: number, dp = 5): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function cmToFt(cm: number | null | undefined): number | undefined {
  if (cm == null) return undefined;
  return round(cm * CM_TO_FT);
}

function cmToM(cm: number | null | undefined): number | undefined {
  if (cm == null) return undefined;
  return round(cm / 100, 5);
}

function orUndef(n: number | null | undefined): number | undefined {
  return n ?? undefined;
}

/** VALD returns times in seconds. Convert to ms, tolerating values already in ms. */
function toMs(sec: number | null | undefined): number | undefined {
  if (sec == null) return undefined;
  return round(sec < 5 ? sec * 1000 : sec, 2);
}

/** Keep a time metric in seconds, tolerating values already in ms. */
function toSec(sec: number | null | undefined): number | undefined {
  if (sec == null) return undefined;
  return round(sec >= 5 ? sec / 1000 : sec, 5);
}

// ── Raw metric access ─────────────────────────────────────────────────────────

type Raw = Record<string, number> | undefined;

function rawOf(test: ValdTest | ValdTestDetail): Raw {
  return 'raw' in test ? (test as ValdTestDetail).raw : undefined;
}

/** Bilateral raw lookup — ForceDecks labels bilateral results "Trial" or "Both". */
function rawBoth(raw: Raw, ...ids: string[]): number | undefined {
  if (!raw) return undefined;
  for (const id of ids) {
    for (const limb of ['Trial', 'Both']) {
      const v = raw[`${id}_${limb}`];
      if (typeof v === 'number') return v;
    }
  }
  return undefined;
}

function rawLimb(raw: Raw, limb: 'Left' | 'Right', ...ids: string[]): number | undefined {
  if (!raw) return undefined;
  for (const id of ids) {
    const v = raw[`${id}_${limb}`];
    if (typeof v === 'number') return v;
  }
  return undefined;
}

// ── Test type classification ──────────────────────────────────────────────────

export function classifyTestType(type: string): 'jump' | 'isometric' | 'pogo' {
  const t = type.toLowerCase();
  const c = t.replace(/[\s_-]/g, '');
  if (t.includes('pogo')) return 'pogo';
  // Reactive hop tests behave like pogo (RSI / contact time)
  if (c === 'hj' || c === 'slhj' || c.includes('hoptest') || c.includes('singleleghop')) return 'pogo';
  if (
    t.includes('isometric') || t.includes('mvc')    ||
    t.includes('imtp')      || t.includes('soleus')  ||
    t.includes('gastroc')   || t.includes('copenhagen') ||
    t.includes('adductor')  || c === 'shldisoy'     ||
    c.includes('shoulderisoy') || c.includes('shoulderiso-y') ||
    (t.includes('shoulder') && (t.includes('y') || t.includes('iso'))) ||
    t.includes('nordboard') || t.includes('nordbord')
  ) return 'isometric';
  return 'jump';
}

export function mapTestName(type: string): string {
  const t = type.toLowerCase().replace(/[\s_-]/g, '');

  // Countermovement Jump variants
  if (t === 'leftcmj' || t.includes('leftcountermovement')) return 'Left Side Countermovement Jump';
  if (t === 'rightcmj' || t.includes('rightcountermovement')) return 'Right Side Countermovement Jump';
  if (t === 'slcmj' || t.includes('singlelegcountermovement')) return 'Single Leg Countermovement Jump';
  if (t === 'cmj' || t.includes('countermovement')) return 'Countermovement Jump';

  // Drop Jump variants
  if (t === 'leftdj' || t.includes('leftdrop')) return 'Left Side Drop Jump';
  if (t === 'rightdj' || t.includes('rightdrop')) return 'Right Side Drop Jump';
  if (t === 'sldj' || t.includes('singlelegdrop') || t.includes('singlelegdj')) return 'Single Leg Drop Jump';
  if (t === 'dj' || t.includes('dropjump')) return 'Drop Jump';

  // Squat Jump variants
  if (t === 'slsj' || t.includes('singlelegsquat')) return 'Single Leg Squat Jump';
  if (t === 'sj' || t.includes('squatjump')) return 'Squat Jump';

  // Pogo Jump variants
  if (t.includes('pogo')) return 'Pogo Jump';

  // Hop / single leg jump tests
  if (t === 'slhj' || t.includes('singleleghoptest') || t.includes('singleleghop')) return 'Single Leg Hop Test';
  if (t === 'slj' || t.includes('singlelegjump')) return 'Single Leg Jump';
  if (t === 'hj' || t.includes('hoptest')) return 'Hop Test';

  // Isometric tests
  if (t === 'imtp' || t.includes('isometricmidthigh') || t.includes('midthighpull')) return 'Isometric Mid-Thigh Pull';
  if (t === 'shldisoy' || t.includes('shoulderisoy') || t.includes('shouldery') || (t.includes('shoulder') && t.includes('y'))) return 'Shoulder ISO-Y';
  if (t.includes('isometricsquat') || t.includes('isosquat')) return 'Isometric Squat';
  if (t.includes('isometricpush') || t.includes('isopush')) return 'Isometric Push';

  return type; // preserve original for any unrecognised test
}


// ── Limb summary (used by the L/R comparison UI) ───────────────────────────────

export interface ValdLimbComparison {
  testId: string;
  testDate: string;
  testName: string;
  /** What the L/R values represent, e.g. "Jump Height (cm)" */
  metricLabel: string;
  unit: string;
  left: number | null;
  right: number | null;
  /** VALD-reported asymmetry when available, otherwise derived */
  asymmetryPct: number | null;
  dominantSide: 'Left' | 'Right' | 'Balanced' | null;
}

function derivedAsymmetry(left: number | null, right: number | null): number | null {
  if (left == null || right == null) return null;
  const max = Math.max(left, right);
  if (!max) return null;
  return round(((left - right) / max) * 100, 2);
}

function dominant(left: number | null, right: number | null): ValdLimbComparison['dominantSide'] {
  if (left == null || right == null) return null;
  const diff = derivedAsymmetry(left, right);
  if (diff == null) return null;
  if (Math.abs(diff) < 2) return 'Balanced';
  return diff > 0 ? 'Left' : 'Right';
}

/** Extract Left vs Right comparison for one VALD test (list row or detail). */
export function valdLimbComparison(test: ValdTest | ValdTestDetail): ValdLimbComparison | null {
  const category = classifyTestType(test.type);
  const raw = rawOf(test);
  const d = test as ValdTestDetail;
  const testName = mapTestName(test.type);

  let left: number | null = null;
  let right: number | null = null;
  let metricLabel = '';
  let unit = '';
  let reported: number | null = null;

  if (category === 'isometric') {
    left = d.solL ?? rawLimb(raw, 'Left', 'PEAK_FORCE', 'PEAK_VERTICAL_FORCE') ?? null;
    right = d.solR ?? rawLimb(raw, 'Right', 'PEAK_FORCE', 'PEAK_VERTICAL_FORCE') ?? null;
    metricLabel = 'Peak Force';
    unit = 'N';
  } else if (testName === 'Drop Jump') {
    left = d.djL ?? rawLimb(raw, 'Left', 'PEAK_LANDING_FORCE') ?? null;
    right = d.djR ?? rawLimb(raw, 'Right', 'PEAK_LANDING_FORCE') ?? null;
    metricLabel = 'Peak Landing Force';
    unit = 'N';
    reported = d.djAsym ?? null;
  } else {
    // CMJ / SJ / Pogo — prefer takeoff force per limb, fall back to jump height per limb
    const fl = rawLimb(raw, 'Left', 'PEAK_TAKEOFF_FORCE', 'MEAN_TAKEOFF_FORCE', 'PEAK_VERTICAL_FORCE');
    const fr = rawLimb(raw, 'Right', 'PEAK_TAKEOFF_FORCE', 'MEAN_TAKEOFF_FORCE', 'PEAK_VERTICAL_FORCE');
    if (fl != null || fr != null) {
      left = fl ?? null;
      right = fr ?? null;
      metricLabel = 'Peak Take-off Force';
      unit = 'N';
    } else {
      left = test.cmjHL ?? null;
      right = test.cmjHR ?? null;
      metricLabel = 'Jump Height';
      unit = 'cm';
    }
    reported = test.cmjAsym ?? null;
  }

  if (left == null && right == null) return null;

  return {
    testId: test.id,
    testDate: test.date,
    testName,
    metricLabel,
    unit,
    left,
    right,
    asymmetryPct: reported ?? derivedAsymmetry(left, right),
    dominantSide: dominant(left, right),
  };
}

export function valdLimbComparisons(tests: (ValdTest | ValdTestDetail)[]): ValdLimbComparison[] {
  return tests
    .map(valdLimbComparison)
    .filter((c): c is ValdLimbComparison => !!c)
    .sort((a, b) => b.testDate.localeCompare(a.testDate));
}

// ── Metric mappers ────────────────────────────────────────────────────────────

type Flavour = 'dashboard' | 'report';

function toJumpMetrics(test: ValdTest | ValdTestDetail, flavour: Flavour): JumpMetrics {
  const mappedName = mapTestName(test.type);
  const isDJ =
    mappedName === 'Drop Jump'             ||
    mappedName === 'Single Leg Drop Jump'  ||
    mappedName === 'Left Side Drop Jump'   ||
    mappedName === 'Right Side Drop Jump';
  const heightCm = isDJ ? (test.djH ?? test.cmjH) : test.cmjH;
  const rsiVal   = isDJ ? test.djRSI : test.cmjRSI;
  const ctVal    = isDJ ? test.djCT  : null;
  const raw      = rawOf(test);
  const d        = test as ValdTestDetail;

  const m: JumpMetrics & Record<string, number | undefined> = {
    // Height: dashboard reads ft/cm, the PDF generator reads metres
    jump_height_ft: flavour === 'report' ? cmToM(heightCm) : cmToFt(heightCm),
    jump_height_cm: flavour === 'report' ? cmToM(heightCm) : orUndef(heightCm),
    peak_power:     orUndef(test.cmjPP ?? rawBoth(raw, 'PEAK_TAKEOFF_POWER', 'PEAK_PROPULSIVE_POWER')),
    rsi:            orUndef(rsiVal),
  };

  const contactSeconds = ctVal ?? rawBoth(raw, 'GROUND_CONTACT_TIME', 'CONTRACTION_TIME');
  const flightSeconds  = ('flightTime' in (d as any) ? (d as any).flightTime : undefined) ??
                         rawBoth(raw, 'FLIGHT_TIME');

  m.contact_time = flavour === 'report' ? toSec(contactSeconds) : toMs(contactSeconds);
  m.flight_time  = flavour === 'report' ? toSec(flightSeconds)  : toMs(flightSeconds);
  m.time_to_takeoff = toSec(contactSeconds);

  m.body_mass            = rawBoth(raw, 'BODY_WEIGHT', 'BODY_MASS') ?? (d as any).bodyWeight ?? undefined;
  m.peak_force           = rawBoth(raw, 'PEAK_TAKEOFF_FORCE', 'PEAK_PROPULSIVE_FORCE', 'PEAK_FORCE');
  m.avg_propulsive_force = rawBoth(raw, 'MEAN_TAKEOFF_FORCE', 'AVG_PROPULSIVE_FORCE');
  m.avg_propulsive_power = rawBoth(raw, 'MEAN_TAKEOFF_POWER', 'AVG_PROPULSIVE_PWR', 'AVG_PROPULSIVE_POWER');
  m.avg_braking_force    = rawBoth(raw, 'MEAN_ECCENTRIC_BRAKING_FORCE', 'AVG_BRAKING_FORCE', 'PEAK_BRAKING_FORCE');
  m.avg_braking_power    = rawBoth(raw, 'MEAN_ECCENTRIC_BRAKING_POWER', 'AVG_BRAKING_PWR', 'PEAK_BRAKING_PWR');
  m.braking_duration     = rawBoth(raw, 'BRAKING_PHASE_DURATION', 'BRAKING_DURATION');
  m.net_impulse          = rawBoth(raw, 'NET_IMPULSE', 'CONCENTRIC_IMPULSE', 'PROPULSIVE_IMPULSE');
  m.takeoff_velocity     = rawBoth(raw, 'TAKEOFF_VELOCITY', 'PEAK_TAKEOFF_VELOCITY', 'VELOCITY_AT_TAKEOFF');
  m.peak_velocity        = rawBoth(raw, 'PEAK_VELOCITY', 'PEAK_TAKEOFF_VELOCITY');
  m.avg_rfd              = rawBoth(raw, 'MEAN_RFD', 'AVG_RFD', 'RFD', 'PEAK_RFD');
  m.time_to_peak_force   = rawBoth(raw, 'TIME_TO_PEAK_FORCE');

  // Relative peak power so the dashboard tile can also read it directly
  if (m.peak_power != null && m.body_mass) {
    m.relative_peak_power = round(m.peak_power / m.body_mass, 3);
  }

  // ── Left / Right limb fields (CC Athletics symmetry keys) ──
  if (isDJ) {
    const l = d.djL ?? rawLimb(raw, 'Left', 'PEAK_LANDING_FORCE');
    const r = d.djR ?? rawLimb(raw, 'Right', 'PEAK_LANDING_FORCE');
    if (l != null) m.fp1_peak_landing_force = l;
    if (r != null) m.fp2_peak_landing_force = r;
    m.peak_landing_force = rawBoth(raw, 'PEAK_LANDING_FORCE');
    if (d.djAsym != null) m.asymmetry_index = d.djAsym;
  } else {
    const l = rawLimb(raw, 'Left', 'PEAK_TAKEOFF_FORCE', 'MEAN_TAKEOFF_FORCE') ?? test.cmjHL ?? undefined;
    const r = rawLimb(raw, 'Right', 'PEAK_TAKEOFF_FORCE', 'MEAN_TAKEOFF_FORCE') ?? test.cmjHR ?? undefined;
    if (l != null) { m.p1_avg_force = l; m.fp1_peak_force = l; }
    if (r != null) { m.p2_avg_force = r; m.fp2_peak_force = r; }
    if (test.cmjHL != null) m.jump_height_left_cm = test.cmjHL;
    if (test.cmjHR != null) m.jump_height_right_cm = test.cmjHR;
    if (test.cmjAsym != null) m.asymmetry_index = test.cmjAsym;
  }

  return m;
}

function toIsometricMetrics(test: ValdTest | ValdTestDetail): IsometricMetrics {
  const m: IsometricMetrics & Record<string, number | undefined> = {};
  const d = test as ValdTestDetail;
  const raw = rawOf(test);

  const left  = d.solL ?? rawLimb(raw, 'Left', 'PEAK_FORCE', 'PEAK_VERTICAL_FORCE');
  const right = d.solR ?? rawLimb(raw, 'Right', 'PEAK_FORCE', 'PEAK_VERTICAL_FORCE');
  if (left != null) m.force_peak_left = left;
  if (right != null) m.force_peak_right = right;

  m.force_peak =
    rawBoth(raw, 'PEAK_FORCE', 'PEAK_VERTICAL_FORCE', 'STABLE_FORCE_READING') ??
    (left != null && right != null ? round(left + right, 2) : left ?? right ?? undefined);

  const fw = (...ids: string[]): number | undefined => {
    const both = rawBoth(raw, ...ids);
    if (both != null) return both;
    const l = rawLimb(raw, 'Left', ...ids);
    const r = rawLimb(raw, 'Right', ...ids);
    if (l != null && r != null) return round((l + r) / 2, 2);
    return l ?? r ?? undefined;
  };

  m.force_50ms  = fw('FORCE_AT_50MS', 'FORCE_50MS', 'EARLY_FORCE_CAPACITY');
  m.force_100ms = fw('FORCE_AT_100MS', 'FORCE_100MS');
  m.force_150ms = fw('FORCE_AT_150MS', 'FORCE_150MS');
  m.force_200ms = fw('FORCE_AT_200MS', 'FORCE_200MS');
  m.force_250ms = fw('FORCE_AT_250MS', 'FORCE_250MS', 'MODERATE_LATE_FORCE') ??
                  (d.gasL != null && d.gasR != null ? round((d.gasL + d.gasR) / 2, 2) : d.gasL ?? d.gasR ?? undefined);
  if (d.gasL != null) m.force_250ms_left = d.gasL;
  if (d.gasR != null) m.force_250ms_right = d.gasR;

  m.rfd_max          = fw('PEAK_RFD', 'RFD_MAX', 'MAX_RFD');
  m.force_at_max_rfd = fw('FORCE_AT_MAX_RFD');
  m.rfd_50ms  = fw('RFD_AT_50MS', 'RFD_50MS');
  m.rfd_100ms = fw('RFD_AT_100MS', 'RFD_100MS');
  m.rfd_150ms = fw('RFD_AT_150MS', 'RFD_150MS');
  m.rfd_200ms = fw('RFD_AT_200MS', 'RFD_200MS');
  m.rfd_250ms = fw('RFD_AT_250MS', 'RFD_250MS');

  m.impulse_50ms  = fw('IMPULSE_AT_50MS', 'IMPULSE_50MS');
  m.impulse_100ms = fw('IMPULSE_AT_100MS', 'IMPULSE_100MS');
  m.impulse_150ms = fw('IMPULSE_AT_150MS', 'IMPULSE_150MS');
  m.impulse_200ms = fw('IMPULSE_AT_200MS', 'IMPULSE_200MS');
  m.impulse_250ms = fw('IMPULSE_AT_250MS', 'IMPULSE_250MS');

  m.steadiness_force = fw('STABLE_FORCE_READING', 'MEAN_FORCE');

  if (left != null && right != null) {
    m.asymmetry_index = derivedAsymmetry(left, right) ?? undefined;
  }

  return m;
}

function toPogoMetrics(test: ValdTest | ValdTestDetail, flavour: Flavour): PogoMetrics {
  const raw = rawOf(test);
  const d = test as ValdTestDetail;
  const heightCm = test.pjH;
  const height = flavour === 'report' ? cmToM(heightCm) : orUndef(heightCm);
  const ctSeconds = ('pjCT' in d ? d.pjCT : null) ?? rawBoth(raw, 'GROUND_CONTACT_TIME');
  const ftSeconds = rawBoth(raw, 'FLIGHT_TIME');
  const ct = flavour === 'report' ? toSec(ctSeconds) : toMs(ctSeconds);
  const ft = flavour === 'report' ? toSec(ftSeconds) : toMs(ftSeconds);
  const rsi = orUndef(test.pjRSI);
  const power = rawBoth(raw, 'PEAK_PROPULSIVE_POWER', 'PEAK_TAKEOFF_POWER', 'PEAK_PROPULSIVE_PWR');
  const mRsi = rawBoth(raw, 'RSI_MODIFIED', 'RSI_MODIFIED_IMP_MOM');

  const m: PogoMetrics & Record<string, number | undefined> = {
    jump_height: height,      avg_jump_height: height,
    avg_jump_height_cm: flavour === 'report' ? cmToM(heightCm) : orUndef(heightCm),
    contact_time: ct,         avg_contact_time: ct,
    flight_time: ft,          avg_flight_time: ft,
    avg_rsi: rsi,
    power, avg_power: power,
  };
  if (mRsi != null) { m.avg_modified_rsi = mRsi; m.modified_rsi = mRsi; }

  // Limb contribution (%) used by the pogo symmetry chart
  const l = rawLimb(raw, 'Left', 'PEAK_VERTICAL_FORCE', 'PEAK_FORCE', 'MEAN_FORCE');
  const r = rawLimb(raw, 'Right', 'PEAK_VERTICAL_FORCE', 'PEAK_FORCE', 'MEAN_FORCE');
  if (l != null && r != null && l + r > 0) {
    m.avg_fp1_contribution = round((l / (l + r)) * 100, 2);
    m.avg_fp2_contribution = round((r / (l + r)) * 100, 2);
    m.fp1_contribution = m.avg_fp1_contribution;
    m.fp2_contribution = m.avg_fp2_contribution;
    m.asymmetry_index = derivedAsymmetry(l, r) ?? undefined;
  }
  return m;
}

// ── Public API ────────────────────────────────────────────────────────────────

function convert(
  test: ValdTest | ValdTestDetail,
  athlete: ValdAthlete,
  flavour: Flavour,
): TestData {
  const category = classifyTestType(test.type);
  const metrics =
    category === 'pogo'      ? toPogoMetrics(test, flavour) :
    category === 'isometric' ? toIsometricMetrics(test) :
                               toJumpMetrics(test, flavour);
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

/** Convert one ValdTest or ValdTestDetail into a CC Athletics TestData record. */
export function valdTestToTestData(
  test: ValdTest | ValdTestDetail,
  athlete: ValdAthlete,
): TestData {
  return convert(test, athlete, 'dashboard');
}

/** Convert a ValdTest array into CC Athletics TestData[] for the dashboard charts. */
export function valdTestsToTestData(
  tests: (ValdTest | ValdTestDetail)[],
  athlete: ValdAthlete,
): TestData[] {
  return tests.map(t => convert(t, athlete, 'dashboard'));
}

/**
 * Convert VALD tests into the shape expected by the
 * `generate-force-plate-report` edge function (metres / seconds).
 */
export function valdTestsToReportData(
  tests: (ValdTest | ValdTestDetail)[],
  athlete: ValdAthlete,
): TestData[] {
  return tests
    .map(t => convert(t, athlete, 'report'))
    .sort((a, b) => a.test_date.localeCompare(b.test_date));
}

/**
 * Merge CC Athletics data with VALD data for the same athlete.
 * Result is sorted by date descending so the most recent test appears first
 * regardless of which system it came from.
 */
export function mergeWithCCData(
  ccData: TestData[],
  valdTests: (ValdTest | ValdTestDetail)[],
  athlete: ValdAthlete,
): TestData[] {
  return [...ccData, ...valdTestsToTestData(valdTests, athlete)]
    .sort((a, b) => b.test_date.localeCompare(a.test_date));
}


/**
 * For unilateral VALD tests (SLJ, SLDJ, SLHJ), produce a Left/Right Side pair
 * so the report generator renders a LIMB COMPARISON page (matching CC Athletics).
 *
 * Mapping:
 *   SLJ  (Single Leg Jump)     → Left/Right Side Countermovement Jump
 *   SLDJ (Single Leg Drop Jump)→ Left/Right Side Drop Jump
 *   SLHJ (Single Leg Hop Test) → Left/Right Side Pogo Jump
 *
 * The bridge must return djL/djR from separate left/right trials.
 */
export function valdDetailToLimbPair(
  detail: ValdTestDetail,
  athlete: ValdAthlete,
): TestData[] | null {
  const t = detail.type.toLowerCase().replace(/[\s_-]/g, '');
  
  let baseName: string | null = null;
  if (t === 'slj') baseName = 'Countermovement Jump';
  else if (t === 'sldj') baseName = 'Drop Jump';
  else if (t === 'slhj') baseName = 'Pogo Jump';
  
  if (!baseName) return null; // not a unilateral test we handle this way
  
  const raw = (detail as any).raw as Record<string, number> | undefined;
  const djL: number | null = (detail as any).djL ?? null;
  const djR: number | null = (detail as any).djR ?? null;
  
  if (djL == null && djR == null) return null; // no limb data available
  
  // Convert jump height cm → ft for CC Athletics (report generator converts back to cm)
  const cmToFt = (cm: number | null) => cm != null ? Math.round(cm * 0.0328084 * 100000) / 100000 : undefined;
  
  // RSI already divided by 100 in bridge (cm/s → m/s)
  const rsi = (detail as any).cmjRSI ?? (detail as any).pjRSI ?? null;
  const ct = (detail as any).djCT ?? (detail as any).pjCT ?? null;
  const ft = raw?.['FLIGHT_TIME_Trial'] ?? null;
  const pp = (detail as any).cmjPP ?? null;
  
  const makeMetrics = (heightCm: number | null) => {
    if (baseName === 'Pogo Jump') {
      return {
        avg_jump_height: heightCm != null ? heightCm / 100 : undefined, // metres
        avg_rsi: rsi ?? undefined,
        avg_contact_time: ct ?? undefined,
        avg_flight_time: ft != null ? ft : undefined,
        avg_power: pp ?? undefined,
      };
    }
    return {
      jump_height_ft: cmToFt(heightCm),
      rsi: rsi ?? undefined,
      contact_time: ct ?? undefined,
      flight_time: ft ?? undefined,
      peak_power: pp ?? undefined,
    };
  };

  const base = {
    athlete_id: athlete.id,
    athlete_name: athlete.name,
    team_name: athlete.teams,
    test_date: detail.date,
    repetition_number: 1,
  };
  
  const results: TestData[] = [];
  
  if (djL != null) {
    results.push({
      ...base,
      test_name: `Left Side ${baseName}`,
      leg_stance: 'left_leg',
      metrics: makeMetrics(djL) as any,
    });
  }
  if (djR != null) {
    results.push({
      ...base,
      test_name: `Right Side ${baseName}`,
      leg_stance: 'right_leg',
      metrics: makeMetrics(djR) as any,
    });
  }
  
  return results.length ? results : null;
}
