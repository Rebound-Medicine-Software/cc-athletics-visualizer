/**
 * Movement Phase Engine
 * ---------------------
 * Shared detection + analysis primitives applied to force-time traces and
 * summary-only API rows. Implements concepts from Pedley et al. (2023):
 *
 *  - Phase segmentation (pre-contact → braking → propulsive → flight)
 *  - Impact peak detection (braking peak inside first 20% of ground contact)
 *  - Spring-like correlation: Pearson r between CoM displacement and |F|
 *    during ground contact. r ≤ -0.80 → spring-like behaviour present.
 *  - SSC classification (Good / Moderate / Poor) from impact-peak + spring-like
 *  - Modelled vs actual force profile (half-sine model) with quintile impulse
 *    breakdown to surface early/mid/late strategy issues.
 *  - Prescription suggestions per detected issue.
 *
 * The engine accepts either:
 *  - a Trace (array of {t,f,[com]} samples) → full phase analysis, or
 *  - a SummaryMetrics map (single API row metrics) → metric-derived phases
 *    (eccentric/concentric duration, braking/propulsive impulse, etc.).
 *
 * No curve is fabricated when only summary is available — the consumer should
 * render a "summary-only" state in that case.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TestKind =
  | 'cmj' | 'cmj_sl'
  | 'dj'  | 'dj_sl'
  | 'sj'
  | 'pogo' | 'pogo_sl'
  | 'imtp' | 'isometric_squat' | 'isometric_calf' | 'isometric'
  | 'squat' | 'sit_to_stand'
  | 'golf_swing'
  | 'balance' | 'balance_sl'
  | 'unknown';

export interface TraceSample {
  /** seconds */
  t: number;
  /** absolute vertical force (N) — sum of legs */
  f: number;
  /** centre-of-mass displacement (m) relative to standing height. Optional. */
  com?: number;
}

export interface PhaseBand {
  key:
    | 'pre_contact' | 'quiet' | 'unweighting' | 'braking' | 'propulsive'
    | 'take_off' | 'flight' | 'landing' | 'second_landing'
    | 'baseline' | 'onset' | 'ramp' | 'peak' | 'plateau' | 'relaxation'
    | 'eccentric' | 'concentric' | 'bottom' | 'lockout'
    | 'setup' | 'backswing' | 'transition' | 'downswing' | 'impact' | 'follow_through' | 'finish';
  label: string;
  /** seconds */
  startT: number;
  endT: number;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}

export interface PhaseEvent {
  key:
    | 'initial_contact' | 'braking_peak' | 'peak_com' | 'propulsive_peak'
    | 'take_off' | 'second_landing' | 'impact_peak'
    | 'force_onset' | 'peak_force' | 'rfd_peak';
  label: string;
  t: number;
  f?: number;
}

export interface SpringLikeResult {
  /** Pearson r between CoM displacement and |F| during ground contact. */
  r: number | null;
  /** r ≤ -0.80 = spring-like behaviour present (Pedley et al. 2023). */
  isSpringLike: boolean | null;
}

export interface ModelledVsActual {
  /** Sampled actual force normalised over ground-contact duration */
  actual: { tNorm: number; f: number }[];
  /** Half-sine modelled force matched to peak + duration */
  model: { tNorm: number; f: number }[];
  /** Per-quintile impulse difference (actual − model). */
  quintileDelta: { quintile: 1 | 2 | 3 | 4 | 5; deltaNs: number; pct: number }[];
  /** Heuristic interpretation strings for the practitioner. */
  insights: string[];
}

export type SSCCategory = 'good' | 'moderate' | 'poor' | 'unknown';

export interface ContactAnalysis {
  startT: number;
  endT: number;
  durationMs: number;
  brakingPeakT: number;
  brakingPeakF: number;
  propulsivePeakT: number;
  propulsivePeakF: number;
  brakingImpulseNs: number;
  propulsiveImpulseNs: number;
  brakingPropulsiveRatio: number;
  hasImpactPeak: boolean;
  springLike: SpringLikeResult;
  sscCategory: SSCCategory;
}

export interface PhaseAnalysis {
  test: TestKind;
  hasTrace: boolean;
  bands: PhaseBand[];
  events: PhaseEvent[];
  contacts: ContactAnalysis[];
  /** Aggregate spring-like result (first contact, or single contact). */
  springLike: SpringLikeResult;
  sscCategory: SSCCategory;
  modelled?: ModelledVsActual;
  /** Derived summary metrics (works for trace OR summary-only). */
  derived: {
    brakingImpulseNs?: number;
    propulsiveImpulseNs?: number;
    eccentricDurationMs?: number;
    concentricDurationMs?: number;
    contactTimeMs?: number;
    flightTimeMs?: number;
    rsi?: number;
    rsiModified?: number;
    jumpHeightCm?: number;
    peakForceN?: number;
    impactPeakF?: number;
  };
  /** Practitioner prescription suggestions linked to detected issues. */
  prescriptions: { issue: string; focus: string }[];
}

// ---------------------------------------------------------------------------
// Test-kind inference
// ---------------------------------------------------------------------------

export const inferTestKind = (
  testType?: string | null,
  testSubtype?: string | null,
  testName?: string | null,
): TestKind => {
  const tt = (testType ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const st = (testSubtype ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const tn = (testName ?? '').toLowerCase();
  const sl = /(single|sl|unilat|left|right)/.test(`${st} ${tn}`);
  if (st === 'golf_swing' || tn.includes('golf')) return 'golf_swing';
  if (tt === 'pogo' || tn.includes('pogo')) return sl ? 'pogo_sl' : 'pogo';
  if (tt === 'jump' || tn.includes('jump')) {
    if (tn.includes('drop') || st === 'dj') return sl ? 'dj_sl' : 'dj';
    if (tn.includes('squat jump') || st === 'sj') return 'sj';
    return sl ? 'cmj_sl' : 'cmj';
  }
  if (tt === 'isometric' || tt === 'imtp') {
    if (tn.includes('mid-thigh') || tn.includes('imtp')) return 'imtp';
    if (tn.includes('squat')) return 'isometric_squat';
    if (tn.includes('calf')) return 'isometric_calf';
    return 'isometric';
  }
  if (tt === 'balance') return sl ? 'balance_sl' : 'balance';
  if (tn.includes('sit') && tn.includes('stand')) return 'sit_to_stand';
  if (tn.includes('squat')) return 'squat';
  return 'unknown';
};

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

const pearson = (x: number[], y: number[]): number | null => {
  const n = Math.min(x.length, y.length);
  if (n < 4) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : null;
};

const trapezoidal = (samples: TraceSample[], from: number, to: number): number => {
  let s = 0;
  for (let i = from + 1; i <= to; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    s += 0.5 * (samples[i].f + samples[i - 1].f) * dt;
  }
  return s;
};

// ---------------------------------------------------------------------------
// Contact detection (single contact event in a trace)
// ---------------------------------------------------------------------------

const detectContact = (samples: TraceSample[], threshold: number): { start: number; end: number } | null => {
  let start = -1;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].f >= threshold) { start = i; break; }
  }
  if (start < 0) return null;
  let end = samples.length - 1;
  for (let i = start + 1; i < samples.length; i++) {
    if (samples[i].f < threshold * 0.5) { end = i; break; }
  }
  return end - start > 4 ? { start, end } : null;
};

const integrateCoM = (samples: TraceSample[], bodyMassKg: number, start: number, end: number): number[] => {
  // Acceleration = (F - mg)/m, then double-integrate to displacement, starting from rest at contact.
  const g = 9.81;
  const v: number[] = new Array(end - start + 1).fill(0);
  const d: number[] = new Array(end - start + 1).fill(0);
  for (let i = 1; i < v.length; i++) {
    const dt = samples[start + i].t - samples[start + i - 1].t;
    const a = (samples[start + i].f - bodyMassKg * g) / bodyMassKg;
    v[i] = v[i - 1] + a * dt;
    d[i] = d[i - 1] + v[i - 1] * dt + 0.5 * a * dt * dt;
  }
  return d;
};

// ---------------------------------------------------------------------------
// Spring-like correlation (Pedley et al. 2023)
// ---------------------------------------------------------------------------

export const computeSpringLike = (
  samples: TraceSample[],
  contactStart: number,
  contactEnd: number,
  bodyMassKg?: number,
): SpringLikeResult => {
  const f: number[] = [];
  const d: number[] = [];
  const hasCom = samples[contactStart].com !== undefined;
  if (hasCom) {
    for (let i = contactStart; i <= contactEnd; i++) {
      f.push(Math.abs(samples[i].f));
      d.push(samples[i].com as number);
    }
  } else if (bodyMassKg && bodyMassKg > 0) {
    const dArr = integrateCoM(samples, bodyMassKg, contactStart, contactEnd);
    for (let i = contactStart; i <= contactEnd; i++) {
      f.push(Math.abs(samples[i].f));
      d.push(dArr[i - contactStart]);
    }
  } else {
    return { r: null, isSpringLike: null };
  }
  const r = pearson(d, f);
  return { r, isSpringLike: r === null ? null : r <= -0.8 };
};

// ---------------------------------------------------------------------------
// Modelled (half-sine) vs actual force profile
// ---------------------------------------------------------------------------

export const computeModelledVsActual = (
  samples: TraceSample[],
  contactStart: number,
  contactEnd: number,
): ModelledVsActual => {
  const N = 100;
  const t0 = samples[contactStart].t;
  const tEnd = samples[contactEnd].t;
  const dur = tEnd - t0;
  let peak = 0;
  for (let i = contactStart; i <= contactEnd; i++) peak = Math.max(peak, samples[i].f);

  // Resample actual at N normalised points
  const actual: { tNorm: number; f: number }[] = [];
  for (let k = 0; k < N; k++) {
    const target = t0 + (dur * k) / (N - 1);
    let j = contactStart;
    while (j < contactEnd && samples[j + 1].t < target) j++;
    const a = samples[j], b = samples[Math.min(j + 1, contactEnd)];
    const span = b.t - a.t || 1;
    const w = (target - a.t) / span;
    actual.push({ tNorm: k / (N - 1), f: a.f + (b.f - a.f) * w });
  }
  const model = actual.map(({ tNorm }) => ({ tNorm, f: peak * Math.sin(Math.PI * tNorm) }));

  // Quintile impulse delta (actual − model)
  const quintileDelta: ModelledVsActual['quintileDelta'] = [];
  for (let q = 0; q < 5; q++) {
    const lo = Math.floor((q * N) / 5);
    const hi = Math.floor(((q + 1) * N) / 5);
    let sumA = 0, sumM = 0;
    const dt = dur / (N - 1);
    for (let i = lo; i < hi - 1; i++) {
      sumA += 0.5 * (actual[i].f + actual[i + 1].f) * dt;
      sumM += 0.5 * (model[i].f + model[i + 1].f) * dt;
    }
    const delta = sumA - sumM;
    quintileDelta.push({
      quintile: (q + 1) as 1 | 2 | 3 | 4 | 5,
      deltaNs: delta,
      pct: sumM > 0 ? (delta / sumM) * 100 : 0,
    });
  }

  const insights: string[] = [];
  const earlyExcess = quintileDelta[0].pct;
  const midDeficit = (quintileDelta[1].pct + quintileDelta[2].pct) / 2;
  const lateExcess = quintileDelta[4].pct;
  if (earlyExcess > 15) insights.push('High early impulse suggests a passive collision / impact-peak strategy.');
  if (midDeficit < -10) insights.push('Reduced mid-contact impulse suggests poor stiffness and elastic energy utilisation.');
  if (lateExcess > 15) insights.push('Late propulsive dominance suggests slow SSC bias — prefers push-off over rebound.');
  if (insights.length === 0) insights.push('Force profile closely follows the half-sine model — efficient SSC.');

  return { actual, model, quintileDelta, insights };
};

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------

const prescriptionsFor = (analysis: Partial<PhaseAnalysis> & { _flags: Set<string> }): PhaseAnalysis['prescriptions'] => {
  const out: PhaseAnalysis['prescriptions'] = [];
  const f = analysis._flags;
  if (f.has('impact_peak_early')) out.push({ issue: 'Early impact peak detected', focus: 'Drop landing mechanics, quiet landings, eccentric control.' });
  if (f.has('poor_spring_like')) out.push({ issue: 'Poor spring-like correlation', focus: 'Slow SSC preparation, stiffness development, submaximal fast SSC drills.' });
  if (f.has('late_propulsive')) out.push({ issue: 'Late propulsive peak', focus: 'Reactive strength, fast eccentric-concentric coupling.' });
  if (f.has('low_braking_impulse')) out.push({ issue: 'Low braking impulse', focus: 'Eccentric strength, landing tolerance.' });
  if (f.has('asymmetry')) out.push({ issue: 'Bilateral asymmetry', focus: 'Unilateral strength / plyometrics / motor control.' });
  return out;
};

// ---------------------------------------------------------------------------
// Main entry: analyseTrace
// ---------------------------------------------------------------------------

export interface AnalyseTraceOptions {
  test: TestKind;
  bodyMassKg?: number;
  /** Optional minimum force (N) to call ground contact. Default = 5% of peak or 50 N. */
  contactThreshold?: number;
}

export const analyseTrace = (samples: TraceSample[], opts: AnalyseTraceOptions): PhaseAnalysis => {
  const flags = new Set<string>();
  const bands: PhaseBand[] = [];
  const events: PhaseEvent[] = [];
  const contacts: ContactAnalysis[] = [];

  if (samples.length < 8) {
    return baseEmpty(opts.test, flags);
  }
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, s.f);
  const threshold = opts.contactThreshold ?? Math.max(50, peak * 0.05);

  const c = detectContact(samples, threshold);
  if (!c) return baseEmpty(opts.test, flags);

  // Phase peaks within contact
  let brakingPeakIdx = c.start, propulsivePeakIdx = c.start;
  const mid = Math.floor((c.start + c.end) / 2);
  for (let i = c.start; i <= mid; i++) if (samples[i].f > samples[brakingPeakIdx].f) brakingPeakIdx = i;
  for (let i = mid; i <= c.end; i++) if (samples[i].f > samples[propulsivePeakIdx].f) propulsivePeakIdx = i;

  const contactDur = samples[c.end].t - samples[c.start].t;
  const hasImpactPeak = (samples[brakingPeakIdx].t - samples[c.start].t) <= 0.20 * contactDur;
  if (hasImpactPeak) flags.add('impact_peak_early');

  const brakingImpulse = trapezoidal(samples, c.start, mid);
  const propulsiveImpulse = trapezoidal(samples, mid, c.end);
  if (brakingImpulse < 0.6 * propulsiveImpulse) flags.add('low_braking_impulse');
  if ((samples[propulsivePeakIdx].t - samples[c.start].t) > 0.7 * contactDur) flags.add('late_propulsive');

  const springLike = computeSpringLike(samples, c.start, c.end, opts.bodyMassKg);
  if (springLike.isSpringLike === false) flags.add('poor_spring_like');

  const ssc = classifySSC(hasImpactPeak, springLike.isSpringLike);
  contacts.push({
    startT: samples[c.start].t,
    endT: samples[c.end].t,
    durationMs: contactDur * 1000,
    brakingPeakT: samples[brakingPeakIdx].t,
    brakingPeakF: samples[brakingPeakIdx].f,
    propulsivePeakT: samples[propulsivePeakIdx].t,
    propulsivePeakF: samples[propulsivePeakIdx].f,
    brakingImpulseNs: brakingImpulse,
    propulsiveImpulseNs: propulsiveImpulse,
    brakingPropulsiveRatio: propulsiveImpulse > 0 ? brakingImpulse / propulsiveImpulse : 0,
    hasImpactPeak,
    springLike,
    sscCategory: ssc,
  });

  // Bands + events
  bands.push({ key: 'pre_contact', label: 'Pre-contact', startT: samples[0].t, endT: samples[c.start].t, tone: 'neutral' });
  bands.push({ key: 'braking', label: 'Braking', startT: samples[c.start].t, endT: samples[mid].t, tone: hasImpactPeak ? 'warn' : 'good' });
  bands.push({ key: 'propulsive', label: 'Propulsive', startT: samples[mid].t, endT: samples[c.end].t, tone: 'good' });
  bands.push({ key: 'flight', label: 'Flight', startT: samples[c.end].t, endT: samples[samples.length - 1].t, tone: 'neutral' });

  events.push({ key: 'initial_contact', label: 'Initial contact', t: samples[c.start].t, f: samples[c.start].f });
  events.push({ key: 'braking_peak', label: 'Braking peak', t: samples[brakingPeakIdx].t, f: samples[brakingPeakIdx].f });
  events.push({ key: 'propulsive_peak', label: 'Propulsive peak', t: samples[propulsivePeakIdx].t, f: samples[propulsivePeakIdx].f });
  events.push({ key: 'take_off', label: 'Take-off', t: samples[c.end].t, f: samples[c.end].f });
  if (hasImpactPeak) events.push({ key: 'impact_peak', label: 'Impact peak', t: samples[brakingPeakIdx].t, f: samples[brakingPeakIdx].f });

  const modelled = computeModelledVsActual(samples, c.start, c.end);

  return {
    test: opts.test,
    hasTrace: true,
    bands,
    events,
    contacts,
    springLike,
    sscCategory: ssc,
    modelled,
    derived: {
      contactTimeMs: contactDur * 1000,
      brakingImpulseNs: brakingImpulse,
      propulsiveImpulseNs: propulsiveImpulse,
      peakForceN: peak,
      impactPeakF: hasImpactPeak ? samples[brakingPeakIdx].f : undefined,
    },
    prescriptions: prescriptionsFor({ _flags: flags }),
  };
};

const baseEmpty = (test: TestKind, flags: Set<string>): PhaseAnalysis => ({
  test, hasTrace: false, bands: [], events: [], contacts: [],
  springLike: { r: null, isSpringLike: null }, sscCategory: 'unknown',
  derived: {}, prescriptions: prescriptionsFor({ _flags: flags }),
});

export const classifySSC = (hasImpactPeak: boolean, isSpringLike: boolean | null): SSCCategory => {
  if (isSpringLike === null) return 'unknown';
  if (!hasImpactPeak && isSpringLike) return 'good';
  if (hasImpactPeak && !isSpringLike) return 'poor';
  return 'moderate';
};

// ---------------------------------------------------------------------------
// Summary-only path (API rows): derive phases from summary metric keys
// ---------------------------------------------------------------------------

const num = (v: any): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

export const analyseSummary = (test: TestKind, metrics: Record<string, any>): PhaseAnalysis => {
  const m = metrics ?? {};
  const flags = new Set<string>();
  const left = num(m.force_peak_left);
  const right = num(m.force_peak_right);
  if (left !== null && right !== null) {
    const asym = Math.abs(left - right) / Math.max(left, right);
    if (asym > 0.1) flags.add('asymmetry');
  }
  const derived: PhaseAnalysis['derived'] = {
    contactTimeMs: num(m.contact_time) ?? undefined,
    flightTimeMs: num(m.flight_time) ?? undefined,
    rsi: num(m.rsi) ?? undefined,
    rsiModified: num(m.rsi_modified) ?? undefined,
    jumpHeightCm: num(m.jump_height_ft) ?? num(m.jump_height_ni) ?? undefined,
    peakForceN: num(m.peak_force) ?? num(m.force_peak) ?? undefined,
    brakingImpulseNs: num(m.braking_impulse) ?? undefined,
    propulsiveImpulseNs: num(m.propulsive_impulse) ?? undefined,
    eccentricDurationMs: num(m.braking_duration) ?? undefined,
    concentricDurationMs: num(m.propulsive_duration) ?? undefined,
  };
  return {
    test, hasTrace: false, bands: [], events: [], contacts: [],
    springLike: { r: null, isSpringLike: null }, sscCategory: 'unknown',
    derived, prescriptions: prescriptionsFor({ _flags: flags }),
  };
};
