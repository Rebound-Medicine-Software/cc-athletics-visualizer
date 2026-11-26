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
    t.includes('nordboard') || t.includes('nordbord') ||
    // Confirmed live from VALD Hub (Postman /trials): Seated / Standing
    // Isometric Calf Raise. Neither contains "isometric" as a substring, so
    // without this explicit check they fell through to the 'jump' bucket and
    // all isometric handling (toIsometricMetrics, limb comparison, report
    // cards) silently skipped them — the root cause of Jess Ball's missing
    // calf data.
    c === 'seicr' || c === 'sticr' ||
    c.includes('isometriccalf') ||
    // Athletic Shoulder (ASH) Test — isometric shoulder protocol.
    c === 'ash' ||
    // Other official VALD isometric protocols (support.vald.com test library).
    c === 'isot' || c === 'slisot' || c === 'isq' ||
    // Safety net: VALD Hub's own "Test Type" catalogue (confirmed live,
    // 22 Nov 2026) lists far more isometric protocols than we have confirmed
    // short codes for yet — Isometric Belt Squat, Isometric Push Up, Run-
    // Specific Ankle/Hip/Knee Iso-Push, Shoulder ISO-IYT, the four Single Leg
    // Hamstring 30/30–90/90 Isometric variants, Single Leg Isometric
    // Mid-Thigh Pull / Squat Hold, and the Single Leg Seated/Standing
    // Isometric Calf Raise variants. VALD's short-code convention embeds
    // "ISO" in effectively every isometric protocol code (ISOT, SLISOT,
    // SHLDISOY, etc.), and no jump/pogo code does, so this substring is a
    // reliable catch-all until each of those codes is confirmed against a
    // live test and added above explicitly.
    c.includes('iso')
  ) return 'isometric';
  return 'jump';
}

export function mapTestName(type: string): string {
  const t = type.toLowerCase().replace(/[\s_-]/g, '');

  // Countermovement Jump variants
  if (t === 'leftcmj' || t.includes('leftcountermovement')) return 'Left Side Countermovement Jump';
  if (t === 'rightcmj' || t.includes('rightcountermovement')) return 'Right Side Countermovement Jump';
  if (t === 'slcmj' || t.includes('singlelegcountermovement')) return 'Single Leg Countermovement Jump';
  if (t === 'cmrj' || t.includes('countermovementrebound')) return 'Countermovement Rebound Jump';
  if (t === 'slcmrj' || t.includes('singlelegcountermovementrebound')) return 'Single Leg Countermovement Rebound Jump';
  if (t === 'lcmj' || t.includes('loadedcountermovement')) return 'Loaded Countermovement Jump';
  if (t === 'abcmj' || t.includes('abalakov')) return 'Abalakov Jump';
  if (t === 'cmj' || t.includes('countermovement')) return 'Countermovement Jump';

  // Drop Jump variants
  if (t === 'leftdj' || t.includes('leftdrop')) return 'Left Side Drop Jump';
  if (t === 'rightdj' || t.includes('rightdrop')) return 'Right Side Drop Jump';
  if (t === 'sldj' || t.includes('singlelegdrop') || t.includes('singlelegdj')) return 'Single Leg Drop Jump';
  if (t === 'dj' || t.includes('dropjump')) return 'Drop Jump';

  // Squat Jump variants
  if (t === 'slsj' || t.includes('singlelegsquat')) return 'Single Leg Squat Jump';
  if (t === 'lsj' || t.includes('loadedsquatjump')) return 'Loaded Squat Jump';
  if (t === 'sj' || t.includes('squatjump')) return 'Squat Jump';
  if (t === 'sqt' || t.includes('squatassessment')) return 'Squat Assessment';

  // Pogo Jump variants
  if (t.includes('pogo')) return 'Pogo Jump';

  // Hop / single leg jump tests
  if (t === 'slhj' || t.includes('singleleghoptest') || t.includes('singleleghop')) return 'Single Leg Hop Test';
  // VALD Hub's own Test Type dropdown labels this just "Hop and Return"
  // (confirmed live, 22 Nov 2026), not "Single Leg Hop and Return" — matching
  // Hub's exact wording is the whole point here, so the shorter name wins.
  if (t === 'slhar' || t.includes('hopandreturn')) return 'Hop and Return';
  if (t === 'slj' || t.includes('singlelegjump')) return 'Single Leg Jump';
  if (t === 'hj' || t.includes('hoptest')) return 'Hop Test';

  // Landing / stability assessments
  if (t === 'sllah' || t.includes('singleleglandandhold')) return 'Single Leg Land and Hold';
  if (t === 'lah' || t.includes('landandhold')) return 'Land and Hold';

  // Isometric tests — includes the two confirmed-live calf raise protocols
  // plus the single-leg variants (confirmed live in VALD Hub's own "Test
  // Type" filter list, 22 Nov 2026 — support.vald.com/hc/en-au test library).
  if (t === 'slseicr' || t.includes('singlelegseatedisometriccalfraise')) return 'Single Leg Seated Isometric Calf Raise';
  if (t === 'slsticr' || t.includes('singlelegstandingisometriccalfraise')) return 'Single Leg Standing Isometric Calf Raise';
  if (t === 'seicr' || t.includes('seatedisometriccalfraise') || t.includes('seatedcalfraise')) return 'Seated Isometric Calf Raise';
  if (t === 'sticr' || t.includes('standingisometriccalfraise') || t.includes('standingcalfraise')) return 'Standing Isometric Calf Raise';
  if (t === 'slimtp' || t.includes('singlelegisometricmidthigh')) return 'Single Leg Isometric Mid-Thigh Pull';
  if (t === 'imtp' || t.includes('isometricmidthigh') || t.includes('midthighpull')) return 'Isometric Mid-Thigh Pull';
  if (t === 'ash' || t.includes('athleticshoulder')) return 'Athletic Shoulder (ASH) Test';
  if (t.includes('shoulderisoiyt') || t.includes('shoulderiyt')) return 'Shoulder ISO-IYT';
  if (t === 'shldisoy' || t.includes('shoulderisoy') || t.includes('shouldery') || (t.includes('shoulder') && t.includes('y'))) return 'Shoulder ISO-Y';
  if (t.includes('shoulderisoi') || (t.includes('shoulder') && t.includes('i') && t.includes('iso'))) return 'Shoulder ISO-I';
  if (t.includes('shoulderisot') || (t.includes('shoulder') && t.includes('t') && t.includes('iso'))) return 'Shoulder ISO-T';
  if (t.includes('hamstring9090')) return 'Single Leg Hamstring 90/90 Isometric';
  if (t.includes('hamstring9020')) return 'Single Leg Hamstring 90/20 Isometric';
  if (t.includes('hamstring6060')) return 'Single Leg Hamstring 60/60 Isometric';
  if (t.includes('hamstring3030')) return 'Single Leg Hamstring 30/30 Isometric';
  if (t.includes('isometricbeltsquat') || t.includes('beltsquat')) return 'Isometric Belt Squat';
  if (t === 'slisq' || t.includes('singlelegisometricsquathold')) return 'Single Leg Isometric Squat Hold';
  if (t === 'isq' || t.includes('isometricsquathold')) return 'Isometric Squat Hold';
  if (t.includes('isometricsquat') || t.includes('isosquat')) return 'Isometric Squat';
  if (t.includes('isometricpushup')) return 'Isometric Push Up';
  if (t.includes('isometricpush') || t.includes('isopush')) return 'Isometric Push';
  if (t.includes('runspecificankleisopush') || t.includes('ankleisopush')) return 'Run-Specific Ankle Iso-Push';
  if (t.includes('runspecifichipisopush') || t.includes('hipisopush')) return 'Run-Specific Hip Iso-Push';
  if (t.includes('runspecifickneeisopush') || t.includes('kneeisopush')) return 'Run-Specific Knee Iso-Push';
  if (t === 'slisot' || t.includes('singlelimbisometric')) return 'Single Limb Isometric Test';
  if (t === 'isot' || t.includes('isometrictest')) return 'Isometric Test';

  // Balance / functional protocols (VALD Hub test library)
  if (t.includes('singlelegrangeofstability')) return 'Single Leg Range of Stability';
  if (t === 'sls' || t.includes('singlelegstand')) return 'Single Leg Stand';
  if (t === 'qs' || t.includes('quietstand')) return 'Quiet Stand';
  if (t.includes('sittostandtosit')) return 'Sit to Stand to Sit';
  if (t.includes('plyometricpushup')) return 'Plyometric Push Up';

  // Other protocols
  // VALD Hub's own Test Type dropdown labels this just "Push Up" (confirmed
  // live, 22 Nov 2026), not "Push Up Test" — matching Hub's exact wording.
  if (t === 'pushupt' || t.includes('pushuptest')) return 'Push Up';
  if (t.includes('bodyweight')) return 'Body Weight';
  if (t === 'gfta' || t.includes('generalforcetime')) return 'General Force-Time Analysis';

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
  // Modified RSI (jump height / contraction time) for every CMJ-family test,
  // Drop Jump included. test.djRSI used to take priority here, which reads
  // VALD's plain Flight:Contraction-time ratio (FLIGHT_CONTRACTION_TIME_RATIO)
  // first - a different, less standard formula than the modified RSI CMJ/SJ
  // already display via cmjRSI. Standardised on cmjRSI (modified) everywhere
  // per Josh's direction so every jump test's "RSI" card is the same formula.
  const rsiVal   = test.cmjRSI;
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
  // Rate of Force Development (concentric/takeoff phase). CC Athletics calls
  // this "Average Rate of Force Development" (avg_rfd). The VALD IDs this
  // previously tried (MEAN_RFD/AVG_RFD/RFD/PEAK_RFD) do not exist anywhere in
  // VALD's /resultdefinitions catalogue (confirmed via a live pull of all 532
  // definitions, 24 Nov 2026) — avg_rfd was always null for every jump test
  // as a result. The real jump-family RFD IDs are CONCENTRIC_RFD /
  // CONCENTRIC_RFD_MAX, confirmed live against Jess Ball's Single Leg Jump
  // /trials data. test.concRfd is vald-bridge's own bilateral lookup of the
  // same IDs (handles the Trial/Both limb aliasing already); rawBoth() here
  // is just a safety-net fallback for callers that only have the raw map.
  m.avg_rfd              = orUndef((d as any).concRfd) ?? rawBoth(raw, 'CONCENTRIC_RFD', 'CONCENTRIC_RFD_MAX');
  m.time_to_peak_force   = rawBoth(raw, 'TIME_TO_PEAK_FORCE');
  // "Early force development" for jumps — the first-50ms window of the same
  // concentric/takeoff RFD above (CONCENTRIC_RFD_50), the jump-family
  // equivalent of isometric's Early Force Capacity (force_50ms). Bilateral
  // value here; per-limb left/right versions are added below for unilateral
  // tests (SLJ etc.).
  m.rfd_50ms             = orUndef((d as any).concRfd50) ?? rawBoth(raw, 'CONCENTRIC_RFD_50');

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
    // Only ever assign a genuine per-limb FORCE value to p1_avg_force /
    // fp1_peak_force (and their Right equivalents) here - never silently
    // fall back to jump height. The report generator's
    // calculateLimbSymmetry() labels this field pair "Peak Force", so
    // conflating a height value into it would mislabel the Limb Symmetry
    // card. jump_height_left_cm / jump_height_right_cm below carry the
    // kinematic fallback honestly, and the edge function already knows to
    // use those (labelled "Jump Height") when no force field is present -
    // which is the normal case for VALD's Single Leg Jump / Single Leg
    // Squat Jump: per VALD's own ForceDecks API docs, a single-limb rep's
    // individual metric results are tagged limb "Trial" (inherited from
    // the parent trial), not "Left"/"Right", so rawLimb() here legitimately
    // finds nothing for those tests and that's expected, not a bug.
    const l = rawLimb(raw, 'Left', 'PEAK_TAKEOFF_FORCE', 'MEAN_TAKEOFF_FORCE');
    const r = rawLimb(raw, 'Right', 'PEAK_TAKEOFF_FORCE', 'MEAN_TAKEOFF_FORCE');
    if (l != null) { m.p1_avg_force = l; m.fp1_peak_force = l; }
    if (r != null) { m.p2_avg_force = r; m.fp2_peak_force = r; }
    if (test.cmjHL != null) m.jump_height_left_cm = test.cmjHL;
    if (test.cmjHR != null) m.jump_height_right_cm = test.cmjHR;
    if (test.cmjAsym != null) m.asymmetry_index = test.cmjAsym;

    // Early force development per limb (single-leg tests only, e.g. SLJ).
    // test.rfd50L / test.rfd50R are vald-bridge's own best-per-side trial
    // extraction (same group-by-trial.limb fix used for cmjHL/cmjHR above —
    // CONCENTRIC_RFD_50 is tagged "Trial" at the result level regardless of
    // which leg performed the rep, exactly like jump height). rawLimb() is
    // a fallback for any shape where the bridge didn't already compute it.
    const rfd50l = orUndef((test as any).rfd50L) ?? rawLimb(raw, 'Left', 'CONCENTRIC_RFD_50');
    const rfd50r = orUndef((test as any).rfd50R) ?? rawLimb(raw, 'Right', 'CONCENTRIC_RFD_50');
    if (rfd50l != null) m.rfd_50ms_left = rfd50l;
    if (rfd50r != null) m.rfd_50ms_right = rfd50r;
    // No bilateral CONCENTRIC_RFD_50 exists for a true single-leg test (every
    // trial is one leg or the other) — fall back to whichever side resolved
    // so the card shows something rather than staying permanently blank.
    if (m.rfd_50ms == null) m.rfd_50ms = rfd50l ?? rfd50r ?? undefined;
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

  // vald-bridge's handleDetail() exposes per-limb early-force as fiftyL/
  // fiftyR (not yet declared on the ValdTestDetail interface in useVald.ts,
  // hence the `as any` access below — same convention this file already
  // uses for bodyWeight/flightTime a few lines up).
  const dFiftyL = (d as any).fiftyL as number | undefined;
  const dFiftyR = (d as any).fiftyR as number | undefined;

  m.force_50ms  = fw('FORCE_AT_50MS', 'FORCE_50MS', 'EARLY_FORCE_CAPACITY') ??
                  (dFiftyL != null && dFiftyR != null ? round((dFiftyL + dFiftyR) / 2, 2) : dFiftyL ?? dFiftyR ?? undefined);
  // Per-limb early-force (50ms) capacity — drives the report's Force
  // Expression Symmetry card. Previously never set anywhere (only the
  // combined force_50ms above existed), unlike the structurally identical
  // force_250ms_left/right below, which is why Expression Symmetry showed
  // "Not available" for every isometric test. fiftyL/fiftyR come from
  // vald-bridge's handleDetail() (FORCE_AT_50MS tagged "Left"/"Right" —
  // confirmed present in live /trials data for Standing + Seated Isometric
  // Calf Raise), with the raw-map lookup kept as a fallback for any caller
  // that only has the bilateral "raw" map and not the handleDetail() fields.
  const fiftyLeft = dFiftyL ?? rawLimb(raw, 'Left', 'FORCE_AT_50MS', 'FORCE_50MS', 'EARLY_FORCE_CAPACITY');
  const fiftyRight = dFiftyR ?? rawLimb(raw, 'Right', 'FORCE_AT_50MS', 'FORCE_50MS', 'EARLY_FORCE_CAPACITY');
  if (fiftyLeft != null) m.force_50ms_left = fiftyLeft;
  if (fiftyRight != null) m.force_50ms_right = fiftyRight;

  m.force_100ms = fw('FORCE_AT_100MS', 'FORCE_100MS');
  m.force_150ms = fw('FORCE_AT_150MS', 'FORCE_150MS');
  m.force_200ms = fw('FORCE_AT_200MS', 'FORCE_200MS');
  m.force_250ms = fw('FORCE_AT_250MS', 'FORCE_250MS', 'MODERATE_LATE_FORCE') ??
                  (d.gasL != null && d.gasR != null ? round((d.gasL + d.gasR) / 2, 2) : d.gasL ?? d.gasR ?? undefined);
  if (d.gasL != null) m.force_250ms_left = d.gasL;
  if (d.gasR != null) m.force_250ms_right = d.gasR;

  m.rfd_max          = fw('PEAK_RFD', 'RFD_MAX', 'MAX_RFD') ?? fw('RFD_AT_150MS', 'RFD_AT_200MS', 'RFD_AT_100MS');
  m.force_at_max_rfd = fw('FORCE_AT_MAX_RFD');
  m.rfd_50ms  = fw('RFD_AT_50MS', 'RFD_50MS');
  m.rfd_100ms = fw('RFD_AT_100MS', 'RFD_100MS');
  m.rfd_150ms = fw('RFD_AT_150MS', 'RFD_150MS');
  m.rfd_200ms = fw('RFD_AT_200MS', 'RFD_200MS');
  m.rfd_250ms = fw('RFD_AT_250MS', 'RFD_250MS');

  // VALD's real result IDs for isometric impulse are "ISO_ABS_IMPULSE_<ms>"
  // (confirmed live via Postman against Jess Ball's calf-raise trial data,
  // 22 Nov 2026) — not "IMPULSE_AT_<ms>MS" / "IMPULSE_<ms>MS", neither of
  // which ever existed on any VALD isometric test. Every impulse_Xms field
  // below was silently undefined for every isometric test (not just calf
  // raises) until this fix, regardless of classifyTestType working correctly.
  m.impulse_50ms  = fw('ISO_ABS_IMPULSE_50', 'IMPULSE_AT_50MS', 'IMPULSE_50MS');
  m.impulse_100ms = fw('ISO_ABS_IMPULSE_100', 'IMPULSE_AT_100MS', 'IMPULSE_100MS');
  m.impulse_150ms = fw('ISO_ABS_IMPULSE_150', 'IMPULSE_AT_150MS', 'IMPULSE_150MS');
  m.impulse_200ms = fw('ISO_ABS_IMPULSE_200', 'IMPULSE_AT_200MS', 'IMPULSE_200MS');
  // Confirmed live: the calf-raise protocols (SEICR/STICR) cap at 200ms —
  // there is no ISO_ABS_IMPULSE_250 result on those tests, same as the force
  // reading above. Fall back to the 200ms value so "Impulse @ 250ms" shows
  // the real latest-available number for calf raises instead of staying
  // blank, while protocols that do report a genuine 250ms value still use it.
  m.impulse_250ms = fw('ISO_ABS_IMPULSE_250', 'IMPULSE_AT_250MS', 'IMPULSE_250MS') ?? m.impulse_200ms;

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
  const ftSeconds = rawBoth(raw, 'FLIGHT_TIME') ?? rawBoth(raw, 'HOP_BEST_FLIGHT_TIME', 'HOP_FLIGHT_TIME', 'HOP_MEAN_FLIGHT_TIME') ?? (('flightTime' in (d as any)) ? (d as any).flightTime : undefined);
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

  // Jump height per limb (used by the report's Limb Symmetry card for
  // single-leg hop/pogo tests - e.g. Single Leg Hop Test). test.cmjHL /
  // test.cmjHR are populated by vald-bridge's hydrateTestMetrics() for
  // unilateral trial.limb-tagged tests (see vald-bridge/index.ts), using the
  // HOP_BEST_JUMP_HEIGHT metric for this family. Mirrors the jump family's
  // jump_height_left_cm / jump_height_right_cm in toJumpMetrics() above.
  if (test.cmjHL != null) m.jump_height_left_cm = test.cmjHL;
  if (test.cmjHR != null) m.jump_height_right_cm = test.cmjHR;
  if (m.asymmetry_index == null && test.cmjAsym != null) m.asymmetry_index = test.cmjAsym;

  // Landing-phase RFD per limb (HOP_BEST_LANDING_RFD) — the Hop-family
  // "how fast" metric. vald-bridge populates hopLandingRfdL/R on the
  // best-per-side trial; mapping them here is what puts landing_rfd_left /
  // landing_rfd_right on the metrics object the Force Expression Symmetry
  // card reads (see generate-force-plate-report). Same as the
  // jump_height_left_cm / jump_height_right_cm block above.
  const landingRfdL = (test as any).hopLandingRfdL;
  const landingRfdR = (test as any).hopLandingRfdR;
  if (landingRfdL != null) m.landing_rfd_left = landingRfdL;
  if (landingRfdR != null) m.landing_rfd_right = landingRfdR;

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
  // Early force development (CONCENTRIC_RFD_50), per limb - same bridge fields
  // toJumpMetrics() reads (see hydrateTestMetrics()/handleDetail() in
  // vald-bridge). Only meaningful for the jump/drop-jump branch below; Pogo
  // Jump (SLHJ) has no concentric-takeoff RFD concept, so it's left out of
  // that shape entirely rather than showing a misleading always-blank card.
  const rfd50L = (detail as any).rfd50L ?? null;
  const rfd50R = (detail as any).rfd50R ?? null;
  // Landing-phase RFD, per limb - Hop Test's own "how fast" metric
  // (HOP_BEST_LANDING_RFD, see ID_HOP_LANDING_RFD in vald-bridge). Hop Test
  // is a continuous rhythmic hop with no concentric/takeoff phase, so it
  // never reports CONCENTRIC_RFD_50 (confirmed live, 25 Nov 2026) - this is
  // the Pogo-family analog of rfd50L/R above, read from the landing phase
  // instead of a takeoff phase.
  const landingRfdL = (detail as any).hopLandingRfdL ?? null;
  const landingRfdR = (detail as any).hopLandingRfdR ?? null;

  const makeMetrics = (heightCm: number | null, rfd50: number | null, landingRfd: number | null) => {
    if (baseName === 'Pogo Jump') {
      return {
        avg_jump_height: heightCm != null ? heightCm / 100 : undefined, // metres
        avg_rsi: rsi ?? undefined,
        avg_contact_time: ct ?? undefined,
        avg_flight_time: ft != null ? ft : undefined,
        avg_power: pp ?? undefined,
        landing_rfd: landingRfd ?? undefined,
      };
    }
    return {
      jump_height_ft: cmToFt(heightCm),
      rsi: rsi ?? undefined,
      contact_time: ct ?? undefined,
      flight_time: ft ?? undefined,
      peak_power: pp ?? undefined,
      rfd_50ms: rfd50 ?? undefined,
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
      metrics: makeMetrics(djL, rfd50L, landingRfdL) as any,
    });
  }
  if (djR != null) {
    results.push({
      ...base,
      test_name: `Right Side ${baseName}`,
      leg_stance: 'right_leg',
      metrics: makeMetrics(djR, rfd50R, landingRfdR) as any,
    });
  }

  return results.length ? results : null;
}
