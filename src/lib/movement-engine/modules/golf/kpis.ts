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
