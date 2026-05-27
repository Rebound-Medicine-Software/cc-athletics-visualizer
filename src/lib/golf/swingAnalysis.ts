// Golf swing biomechanics analysis.
// Pure functions — operate on a time-ordered series of 8-channel force samples.

export interface Sample {
  i: number;          // sample index (proxy for time)
  t: number;          // time (s) = i / sampleRate
  fp1: { bl: number; br: number; fl: number; fr: number };
  fp2: { bl: number; br: number; fl: number; fr: number };
  fp1Total: number;
  fp2Total: number;
  total: number;
  // CoP per plate, plate-local coordinates in arbitrary plate units (-1..+1)
  cop1: { x: number; y: number } | null;
  cop2: { x: number; y: number } | null;
}

export interface SwingWindow {
  index: number;            // 1-based swing number
  startIdx: number;
  endIdx: number;
  phases: PhaseMarker[];
  metrics: SwingMetrics;
}

export interface PhaseMarker {
  name:
    | 'Address'
    | 'Start of backswing'
    | 'Top of swing'
    | 'Transition'
    | 'Downswing'
    | 'Impact'
    | 'Follow-through'
    | 'Finish';
  idx: number;
  value: number;
}

export interface SwingMetrics {
  peakImpactForce: number;
  peakLeftLoad: number;
  peakRightLoad: number;
  peakWeightShiftPct: number;          // max |L%-R%| from 50/50 over swing
  leftDistributionPctAtImpact: number;
  rightDistributionPctAtImpact: number;
  backswingDurationS: number;
  downswingDurationS: number;
  transitionDurationS: number;
  totalSwingDurationS: number;
  tempoRatio: number;                  // backswing / downswing
  forceSymmetryPct: number;            // 100 - peak asymmetry
}

export interface DetectionResult {
  samples: Sample[];
  baselineMean: number;
  baselineSd: number;
  swings: SwingWindow[];
  bestSwingIndex: number | null;
  consistencyScore: number;            // 0..100, higher = more consistent
  sampleRate: number;
}

/** Build samples from raw rows. Rows must contain numeric fp1_*/fp2_* channels. */
export function buildSamples(
  rows: { repetition_number: number; metrics: Record<string, any> }[],
  sampleRate: number,
): Sample[] {
  const sorted = [...rows].sort((a, b) => a.repetition_number - b.repetition_number);
  return sorted.map((r) => {
    const m = flatten(r.metrics);
    const fp1 = {
      bl: num(m.fp1_bl),
      br: num(m.fp1_br),
      fl: num(m.fp1_fl),
      fr: num(m.fp1_fr),
    };
    const fp2 = {
      bl: num(m.fp2_bl),
      br: num(m.fp2_br),
      fl: num(m.fp2_fl),
      fr: num(m.fp2_fr),
    };
    const fp1Total = fp1.bl + fp1.br + fp1.fl + fp1.fr;
    const fp2Total = fp2.bl + fp2.br + fp2.fl + fp2.fr;
    return {
      i: r.repetition_number,
      t: r.repetition_number / sampleRate,
      fp1,
      fp2,
      fp1Total,
      fp2Total,
      total: fp1Total + fp2Total,
      cop1: cop(fp1),
      cop2: cop(fp2),
    };
  });
}

function flatten(m: Record<string, any> | null | undefined): Record<string, any> {
  if (!m) return {};
  const out: Record<string, any> = { ...m };
  const raw = m._raw;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const nk = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (out[nk] === undefined) out[nk] = v;
    }
  }
  return out;
}

function num(v: any): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** Quadrant Centre of Pressure per plate, normalised plate coords (-1..+1). */
function cop(q: { bl: number; br: number; fl: number; fr: number }): { x: number; y: number } | null {
  const sum = q.bl + q.br + q.fl + q.fr;
  if (Math.abs(sum) < 1e-9) return null;
  // x: medial-lateral. FL/BL = -1, FR/BR = +1.
  // y: anterior-posterior. FL/FR = +1, BL/BR = -1.
  const x = ((-1 * q.bl) + (1 * q.br) + (-1 * q.fl) + (1 * q.fr)) / sum;
  const y = ((-1 * q.bl) + (-1 * q.br) + (1 * q.fl) + (1 * q.fr)) / sum;
  return { x, y };
}

/** Simple moving-average smoother. */
function smooth(values: number[], window: number): number[] {
  if (window <= 1) return values;
  const out = new Array(values.length);
  let sum = 0;
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length - 1, i + half);
    sum = 0;
    for (let j = lo; j <= hi; j++) sum += values[j];
    out[i] = sum / (hi - lo + 1);
  }
  return out;
}

/**
 * Detect a stable baseline region (quiet standing) using a sliding window of
 * minimal variance. Returns mean + SD of total force in that region.
 */
function findBaseline(total: number[], sampleRate: number) {
  const winSize = Math.max(50, Math.round(sampleRate * 0.5)); // 0.5s
  if (total.length < winSize * 2) {
    const mean = total.reduce((a, b) => a + b, 0) / total.length;
    const sd = stddev(total, mean);
    return { mean, sd };
  }
  let bestStart = 0;
  let bestSd = Infinity;
  let bestMean = 0;
  for (let i = 0; i + winSize <= total.length; i += Math.floor(winSize / 4)) {
    const slice = total.slice(i, i + winSize);
    const m = slice.reduce((a, b) => a + b, 0) / winSize;
    const s = stddev(slice, m);
    if (s < bestSd) {
      bestSd = s;
      bestMean = m;
      bestStart = i;
    }
  }
  // Floor SD to a tiny number to avoid divide-by-zero with very flat input.
  return { mean: bestMean, sd: Math.max(bestSd, 1e-6), startIdx: bestStart };
}

function stddev(arr: number[], mean: number): number {
  const v = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
  return Math.sqrt(v);
}

/** Main analysis entry point. */
export function analyseSwings(samples: Sample[], sampleRate = 1000): DetectionResult {
  if (samples.length < 10) {
    return {
      samples,
      baselineMean: 0,
      baselineSd: 0,
      swings: [],
      bestSwingIndex: null,
      consistencyScore: 0,
      sampleRate,
    };
  }
  const raw = samples.map((s) => s.total);
  const smoothed = smooth(raw, Math.max(5, Math.round(sampleRate * 0.02)));
  const { mean, sd } = findBaseline(smoothed, sampleRate);

  // ±5 SD detection band
  const k = 5;
  const upper = mean + k * sd;
  const lower = mean - k * sd;

  const minSwingSamples = Math.max(50, Math.round(sampleRate * 0.4));   // ≥0.4s
  const minReturnSamples = Math.max(40, Math.round(sampleRate * 0.3));  // ≥0.3s of calm

  const swings: SwingWindow[] = [];
  let i = 0;
  while (i < smoothed.length) {
    // find first crossing outside band
    while (i < smoothed.length && smoothed[i] <= upper && smoothed[i] >= lower) i++;
    if (i >= smoothed.length) break;
    const startIdx = i;

    // walk until signal is back inside band for `minReturnSamples` continuous samples
    let returnCount = 0;
    let endIdx = i;
    while (i < smoothed.length) {
      if (smoothed[i] <= upper && smoothed[i] >= lower) {
        returnCount++;
        if (returnCount >= minReturnSamples) {
          endIdx = i - minReturnSamples + 1;
          break;
        }
      } else {
        returnCount = 0;
        endIdx = i;
      }
      i++;
    }
    if (endIdx - startIdx >= minSwingSamples) {
      swings.push(buildSwing(swings.length + 1, startIdx, endIdx, samples, smoothed, mean, sampleRate));
    }
  }

  // best swing = highest peak impact * symmetry / variability
  let bestIdx: number | null = null;
  if (swings.length) {
    let bestScore = -Infinity;
    swings.forEach((s, idx) => {
      const score = s.metrics.peakImpactForce * (s.metrics.forceSymmetryPct / 100);
      if (score > bestScore) { bestScore = score; bestIdx = idx; }
    });
  }

  // consistency across swings: 100 - mean CV% of peakImpactForce
  let consistency = 0;
  if (swings.length > 1) {
    const peaks = swings.map((s) => s.metrics.peakImpactForce);
    const m = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    const sdp = stddev(peaks, m);
    const cv = m !== 0 ? Math.abs(sdp / m) * 100 : 0;
    consistency = Math.max(0, Math.min(100, 100 - cv));
  } else if (swings.length === 1) {
    consistency = 100;
  }

  return {
    samples,
    baselineMean: mean,
    baselineSd: sd,
    swings,
    bestSwingIndex: bestIdx,
    consistencyScore: consistency,
    sampleRate,
  };
}

function buildSwing(
  index: number,
  startIdx: number,
  endIdx: number,
  samples: Sample[],
  smoothed: number[],
  baselineMean: number,
  sampleRate: number,
): SwingWindow {
  const slice = samples.slice(startIdx, endIdx + 1);
  // Impact = peak |total - baseline| in window
  let impactIdx = startIdx;
  let peakAbs = 0;
  for (let j = startIdx; j <= endIdx; j++) {
    const d = Math.abs(smoothed[j] - baselineMean);
    if (d > peakAbs) { peakAbs = d; impactIdx = j; }
  }
  // Top of swing = peak trail-side loading (assume right-handed: trail = right plate)
  let topIdx = startIdx;
  let peakTrail = -Infinity;
  for (let j = startIdx; j <= impactIdx; j++) {
    if (samples[j].fp2Total > peakTrail) { peakTrail = samples[j].fp2Total; topIdx = j; }
  }
  // Transition = first sample after top where lead loading begins to rise
  let transitionIdx = topIdx;
  for (let j = topIdx; j <= impactIdx; j++) {
    if (samples[j].fp1Total > samples[topIdx].fp1Total * 1.05) { transitionIdx = j; break; }
  }
  // Follow-through = halfway between impact and end
  const followIdx = Math.min(endIdx, Math.round((impactIdx + endIdx) / 2));

  const phases: PhaseMarker[] = [
    { name: 'Address', idx: startIdx, value: samples[startIdx].total },
    { name: 'Start of backswing', idx: startIdx, value: samples[startIdx].total },
    { name: 'Top of swing', idx: topIdx, value: samples[topIdx].total },
    { name: 'Transition', idx: transitionIdx, value: samples[transitionIdx].total },
    { name: 'Downswing', idx: Math.round((transitionIdx + impactIdx) / 2), value: samples[Math.round((transitionIdx + impactIdx) / 2)].total },
    { name: 'Impact', idx: impactIdx, value: samples[impactIdx].total },
    { name: 'Follow-through', idx: followIdx, value: samples[followIdx].total },
    { name: 'Finish', idx: endIdx, value: samples[endIdx].total },
  ];

  // Metrics
  const peakImpactForce = samples[impactIdx].total;
  const peakLeftLoad = Math.max(...slice.map((s) => s.fp1Total));
  const peakRightLoad = Math.max(...slice.map((s) => s.fp2Total));
  const shifts = slice.map((s) => {
    const tot = Math.abs(s.fp1Total) + Math.abs(s.fp2Total);
    if (tot < 1e-9) return 0;
    return Math.abs((Math.abs(s.fp1Total) - Math.abs(s.fp2Total)) / tot) * 100;
  });
  const peakWeightShiftPct = Math.max(...shifts);
  const totImpact = Math.abs(samples[impactIdx].fp1Total) + Math.abs(samples[impactIdx].fp2Total);
  const leftPctImpact = totImpact > 0 ? (Math.abs(samples[impactIdx].fp1Total) / totImpact) * 100 : 0;
  const rightPctImpact = 100 - leftPctImpact;
  const backswingDurationS = (topIdx - startIdx) / sampleRate;
  const downswingDurationS = (impactIdx - transitionIdx) / sampleRate;
  const transitionDurationS = (transitionIdx - topIdx) / sampleRate;
  const totalSwingDurationS = (endIdx - startIdx) / sampleRate;
  const tempoRatio = downswingDurationS > 0 ? backswingDurationS / downswingDurationS : 0;
  const maxPlate = Math.max(peakLeftLoad, peakRightLoad);
  const forceSymmetryPct = maxPlate > 0
    ? 100 - (Math.abs(peakLeftLoad - peakRightLoad) / maxPlate) * 100
    : 100;

  return {
    index,
    startIdx,
    endIdx,
    phases,
    metrics: {
      peakImpactForce,
      peakLeftLoad,
      peakRightLoad,
      peakWeightShiftPct,
      leftDistributionPctAtImpact: leftPctImpact,
      rightDistributionPctAtImpact: rightPctImpact,
      backswingDurationS,
      downswingDurationS,
      transitionDurationS,
      totalSwingDurationS,
      tempoRatio,
      forceSymmetryPct,
    },
  };
}

/** Practitioner interpretation for a swing. Pure text — no auto-programming. */
export function interpretSwing(s: SwingWindow): string[] {
  const out: string[] = [];
  const m = s.metrics;
  if (m.peakWeightShiftPct < 30) out.push('Limited lead-side pressure shift — work on weight transfer drills.');
  if (m.tempoRatio < 2) out.push('Quick transition — sequencing drills may help rhythm.');
  if (m.tempoRatio > 4) out.push('Slow downswing relative to backswing — explosive rotational power focus.');
  if (m.forceSymmetryPct < 60) out.push('Pronounced left/right loading asymmetry — bilateral strength balancing.');
  if (m.rightDistributionPctAtImpact > 70) out.push('Trail-foot dominant at impact — limited lead-side transfer.');
  if (m.leftDistributionPctAtImpact > 75) out.push('Lead-foot heavily loaded at impact — efficient pressure shift.');
  if (out.length === 0) out.push('Balanced sequencing and pressure transfer — maintain technique.');
  return out;
}
