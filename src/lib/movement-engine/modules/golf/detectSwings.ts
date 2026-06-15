import type { MovementSession, MovementEvent } from '../../core/types';
import { mean, stddev } from '../../core/scoring';

/**
 * v10 Adaptive Golf Swing Detector — state machine approach.
 *
 * Baseline: scans the full recording for the quietest 1-second window
 * (by minimum SD), so it works regardless of where the golfer starts moving.
 * Thresholds: enter = quiet_mean + 5×SD, exit = quiet_mean + 1.5×SD.
 * State machine: searchQuiet → inSwing → back to searchQuiet.
 * After detection, windows are expanded 300 ms pre and 500 ms post to
 * capture address position and follow-through.
 */
export function detectGolfSwings(session: MovementSession): MovementEvent[] {
  const { samples, sampleRateHz } = session;
  if (samples.length < 50) return [];

  const totals = samples.map((s) => s.total);

  // --- Find quietest 1-second window as baseline ---
  const quietWin = Math.max(Math.floor(sampleRateHz), 50);
  let bestStart = 0;
  let bestSd = Infinity;
  const step = Math.max(1, Math.floor(quietWin / 4));
  for (let i = 0; i <= totals.length - quietWin; i += step) {
    const sd = stddev(totals.slice(i, i + quietWin));
    if (sd < bestSd) { bestSd = sd; bestStart = i; }
  }

  const quietSlice = totals.slice(bestStart, bestStart + quietWin);
  const qMean = mean(quietSlice);
  const qSd   = stddev(quietSlice) || qMean * 0.02 || 5;

  const enterThr = qMean + 5.0 * qSd;
  const exitThr  = qMean + 1.5 * qSd;

  // Timing constants
  const minSwingSamples = Math.floor(sampleRateHz * 0.40); // 400 ms minimum duration
  const minGapSamples   = Math.floor(sampleRateHz * 0.50); // 500 ms minimum between swings
  const expandPre       = Math.floor(sampleRateHz * 0.30); // 300 ms pre-expansion
  const expandPost      = Math.floor(sampleRateHz * 0.50); // 500 ms post-expansion

  // --- State machine ---
  type St = 'searchQuiet' | 'inSwing';
  let state: St = 'searchQuiet';
  let enterIdx = -1;
  let lastEnd  = -minGapSamples;
  const segments: Array<{ enter: number; exit: number }> = [];

  for (let i = 0; i < totals.length; i++) {
    if (state === 'searchQuiet') {
      if (totals[i] >= enterThr && (i - lastEnd) >= minGapSamples) {
        state    = 'inSwing';
        enterIdx = i;
      }
    } else {
      if (totals[i] < exitThr) {
        if ((i - enterIdx) >= minSwingSamples) {
          segments.push({ enter: enterIdx, exit: i });
          lastEnd = i;
        }
        state    = 'searchQuiet';
        enterIdx = -1;
      }
    }
  }

  // Swing that reaches end of recording
  if (state === 'inSwing' && enterIdx >= 0 && (totals.length - enterIdx) >= minSwingSamples) {
    segments.push({ enter: enterIdx, exit: totals.length - 1 });
  }

  // --- Expand windows and build events ---
  return segments.map((seg, idx) => {
    const startIdx = Math.max(0, seg.enter - expandPre);
    const endIdx   = Math.min(samples.length - 1, seg.exit + expandPost);
    return {
      index:        idx + 1,
      startTime:    samples[startIdx].t,
      endTime:      samples[endIdx].t,
      phaseMarkers: [],
    };
  });
}
