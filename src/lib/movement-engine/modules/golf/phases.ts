import type { MovementSession, MovementEvent, PhaseMarker, ForceSample } from '../../core/types';

/** Compute golf swing phase markers from a force-trace window. */
export function detectGolfPhases(event: MovementEvent, session: MovementSession): PhaseMarker[] {
  const slice = sliceWindow(session.samples, event.startTime, event.endTime);
  if (slice.length < 10) return [];

  // Impact = peak total force within the window.
  let impactIdx = 0;
  let peak = -Infinity;
  for (let i = 0; i < slice.length; i++) {
    if (slice[i].total > peak) { peak = slice[i].total; impactIdx = i; }
  }

  // Top of backswing = minimum total force in the first 60% before impact.
  const preImpact = slice.slice(0, impactIdx);
  let topIdx = 0;
  if (preImpact.length > 5) {
    let lo = Infinity;
    for (let i = 0; i < preImpact.length; i++) {
      if (preImpact[i].total < lo) { lo = preImpact[i].total; topIdx = i; }
    }
  }

  // Transition = max dF/dt between top and impact.
  let transitionIdx = topIdx;
  let maxRate = -Infinity;
  for (let i = topIdx + 1; i <= impactIdx; i++) {
    const dt = slice[i].t - slice[i - 1].t || 1e-3;
    const rate = (slice[i].total - slice[i - 1].total) / dt;
    if (rate > maxRate) { maxRate = rate; transitionIdx = i; }
  }

  // Backswing start = first sample where total drops > 2% of baseline.
  const baseline = slice[0].total;
  let backStartIdx = 0;
  for (let i = 1; i < topIdx; i++) {
    if (Math.abs(slice[i].total - baseline) / baseline > 0.02) { backStartIdx = i; break; }
  }

  // Follow-through = first sample after impact where force returns within 30% of peak.
  let followIdx = Math.min(impactIdx + 5, slice.length - 1);
  for (let i = impactIdx + 1; i < slice.length; i++) {
    if (slice[i].total < peak * 0.7) { followIdx = i; break; }
  }
  // Finish = end of window
  const finishIdx = slice.length - 1;

  return [
    { name: 'address',         time: slice[0].t },
    { name: 'backswing_start', time: slice[backStartIdx].t },
    { name: 'top',             time: slice[topIdx].t },
    { name: 'transition',      time: slice[transitionIdx].t },
    { name: 'downswing',       time: slice[Math.min(transitionIdx + 1, impactIdx)].t },
    { name: 'impact',          time: slice[impactIdx].t, meta: { peakForce: peak } },
    { name: 'follow_through',  time: slice[followIdx].t },
    { name: 'finish',          time: slice[finishIdx].t },
  ];
}

function sliceWindow(samples: ForceSample[], t0: number, t1: number): ForceSample[] {
  return samples.filter((s) => s.t >= t0 && s.t <= t1);
}
