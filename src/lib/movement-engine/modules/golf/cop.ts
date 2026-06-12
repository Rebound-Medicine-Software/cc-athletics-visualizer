import type { MovementSession, MovementEvent, ForceSample } from '../../core/types';

export interface CopPoint { t: number; x: number; y: number; }
export interface GolfCop {
  lead: CopPoint[];
  trail: CopPoint[];
  combined: CopPoint[];
}

/**
 * Synthetic CoP for a golf swing window. Force-plate exports rarely give true
 * CoP coordinates; we derive a relative anterior–posterior axis from per-foot
 * load and a lateral axis from L/R asymmetry. This is sufficient for
 * visualisation; modules with true 4-channel data can override.
 */
export function computeGolfCop(event: MovementEvent, session: MovementSession): GolfCop {
  const slice = session.samples.filter((s) => s.t >= event.startTime && s.t <= event.endTime);
  return {
    lead: slice.map(toCop('lead')),
    trail: slice.map(toCop('trail')),
    combined: slice.map(toCop('combined')),
  };
}

function toCop(channel: 'lead' | 'trail' | 'combined') {
  return (s: ForceSample): CopPoint => {
    const total = s.total || 1;
    // x: lateral, -1 = full trail, +1 = full lead
    const x = (s.left - s.right) / total;
    // y: AP load proxy, normalised force relative to first sample = 1.0
    const y = total / 1000;
    if (channel === 'lead')  return { t: s.t, x: x * 0.5 + 0.5, y };
    if (channel === 'trail') return { t: s.t, x: x * 0.5 - 0.5, y };
    return { t: s.t, x, y };
  };
}
