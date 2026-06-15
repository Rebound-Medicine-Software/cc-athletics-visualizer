import type { MovementSession, MovementEvent, ForceSample } from '../../core/types';

export interface GolfKpis {
  peak_force: number;        // N
  lead_load_pct: number;     // % at impact
  trail_load_pct: number;    // % at impact
  weight_transfer_pct: number; // lead at impact - lead at top
  tempo_ratio: number;       // backswing / downswing
  cop_quality: number;       // 0-1 path smoothness proxy
  transition_ms: number;
  peak_impact_force: number;
  cop_efficiency: number;
}

export function computeGolfKpis(event: MovementEvent, session: MovementSession): GolfKpis {
  const slice = session.samples.filter((s) => s.t >= event.startTime && s.t <= event.endTime);
  if (!slice.length) return blank();

  const impact = event.phaseMarkers.find((p) => p.name === 'impact');
  const top = event.phaseMarkers.find((p) => p.name === 'top');
  const transition = event.phaseMarkers.find((p) => p.name === 'transition');
  const followThrough = event.phaseMarkers.find((p) => p.name === 'follow_through');

  const impactSample = nearest(slice, impact?.time ?? slice[slice.length - 1].t);
  const topSample = top ? nearest(slice, top.time) : slice[0];

  const leadImpact = pct(impactSample.left, impactSample.total);
  const trailImpact = pct(impactSample.right, impactSample.total);
  const leadTop = pct(topSample.left, topSample.total);
  const weightTransfer = leadImpact - leadTop;

  const backswingMs = top && transition ? (transition.time - top.time) * 1000 : 0;
  const downswingMs = transition && impact ? (impact.time - transition.time) * 1000 : 0;
  const tempo = downswingMs > 0 ? backswingMs / downswingMs : 0;

  const transitionMs = top && transition ? (transition.time - top.time) * 1000 : 0;
  const peakForce = Math.max(...slice.map((s) => s.total));

  // CoP "quality" proxy: lower lateral jitter post-impact = higher score.
  const post = followThrough && impact
    ? slice.filter((s) => s.t >= impact.time && s.t <= followThrough.time)
    : slice;
  const jitter = stddev(post.map((s) => pct(s.left, s.total)));
  const copQuality = Math.max(0, Math.min(1, 1 - jitter / 25));

  return {
    peak_force: round(peakForce),
    lead_load_pct: round(leadImpact),
    trail_load_pct: round(trailImpact),
    weight_transfer_pct: round(weightTransfer),
    tempo_ratio: round(tempo, 2),
    cop_quality: round(copQuality, 2),
    transition_ms: round(transitionMs),
    peak_impact_force: round(peakForce),
    cop_efficiency: round(copQuality * 100),
  };
}

// ---------------------------------------------------------------------------
// 0-100 Scoring — converts raw KPI values to athlete-friendly scores
// Traffic light: ≥80 good (green), ≥58 developing (amber), <58 needs work (red)
// ---------------------------------------------------------------------------

export interface GolfKpiScores {
  lead_load:       number; // 0-100
  weight_transfer: number; // 0-100
  tempo:           number; // 0-100
  transition:      number; // 0-100
  cop_quality:     number; // 0-100
  overall:         number; // 0-100 weighted
}

export function scoreGolfKpis(kpis: GolfKpis): GolfKpiScores {
  if (!kpis.peak_force) {
    return { lead_load: 0, weight_transfer: 0, tempo: 0, transition: 0, cop_quality: 0, overall: 0 };
  }

  // Lead load: 50% → 0,  82% → 100
  const leadLoad = clamp01((kpis.lead_load_pct - 50) / 32) * 100;

  // Weight transfer: 5% → 0,  28% → 100
  const wtPct = clamp01((kpis.weight_transfer_pct - 5) / 23) * 100;

  // Tempo: bell curve centred at 2.8 (ideal 2.5–3.2)
  const tempoScore = kpis.tempo_ratio > 0
    ? Math.max(0, 100 - Math.abs(kpis.tempo_ratio - 2.8) * 45)
    : 50;

  // Transition: 130 ms → 100,  380 ms → 0
  const tranScore = kpis.transition_ms > 0
    ? clamp01(1 - (kpis.transition_ms - 130) / 250) * 100
    : 50;

  // CoP quality: already 0-1 from computation
  const copScore = kpis.cop_quality * 100;

  // Weighted overall
  const overall = leadLoad * 0.30 + wtPct * 0.25 + tempoScore * 0.20 + tranScore * 0.15 + copScore * 0.10;

  return {
    lead_load:       cap(leadLoad),
    weight_transfer: cap(wtPct),
    tempo:           cap(tempoScore),
    transition:      cap(tranScore),
    cop_quality:     cap(copScore),
    overall:         cap(overall),
  };
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function cap(x: number): number { return Math.round(Math.max(0, Math.min(100, x))); }

// ---------------------------------------------------------------------------

function blank(): GolfKpis {
  return {
    peak_force: 0, lead_load_pct: 0, trail_load_pct: 0, weight_transfer_pct: 0,
    tempo_ratio: 0, cop_quality: 0, transition_ms: 0, peak_impact_force: 0, cop_efficiency: 0,
  };
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}
function nearest(samples: ForceSample[], t: number): ForceSample {
  let best = samples[0];
  let bd = Math.abs(samples[0].t - t);
  for (const s of samples) {
    const d = Math.abs(s.t - t);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}
function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
