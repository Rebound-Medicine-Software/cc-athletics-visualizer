import type { MovementSession, MovementEvent } from '../../core/types';
import { mean, stddev } from '../../core/scoring';

/**
 * Detect golf swing windows in a force-trace session.
 * Algorithm: baseline ±5 SD on combined force, sustained crossing of
 * `mean + k*sd` for `holdMs`, merge close windows, expand to fall back to
 * baseline. Markers (top/transition/impact/etc.) are computed in `phases.ts`.
 */
export function detectGolfSwings(session: MovementSession): MovementEvent[] {
  const { samples, sampleRateHz } = session;
  if (samples.length < 50) return [];

  // Baseline = first 1s OR quietest 1s window.
  const baselineWindow = Math.min(samples.length, Math.max(sampleRateHz, 100));
  const baselineForces = samples.slice(0, baselineWindow).map((s) => s.total);
  const baseMean = mean(baselineForces);
  const baseSd = stddev(baselineForces) || baseMean * 0.02;

  const activationThreshold = baseMean + 5 * baseSd;
  const releaseThreshold = baseMean + 2 * baseSd;
  const holdSamples = Math.max(Math.floor(sampleRateHz * 0.15), 5);

  const events: MovementEvent[] = [];
  let i = 0;
  while (i < samples.length) {
    if (samples[i].total < activationThreshold) { i++; continue; }
    // Confirm sustained crossing
    let sustained = 0;
    let j = i;
    while (j < samples.length && samples[j].total >= releaseThreshold) {
      sustained++;
      j++;
    }
    if (sustained >= holdSamples) {
      // Walk back to where we first crossed activation
      let start = i;
      while (start > 0 && samples[start - 1].total > baseMean + baseSd) start--;
      const end = Math.min(j + Math.floor(sampleRateHz * 0.2), samples.length - 1);
      events.push({
        index: events.length + 1,
        startTime: samples[start].t,
        endTime: samples[end].t,
        phaseMarkers: [],
      });
      i = end + Math.floor(sampleRateHz * 0.3); // skip refractory
    } else {
      i = j + 1;
    }
  }
  return events;
}
