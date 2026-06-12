// Generic scoring helpers reusable across movement modules.

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function coefficientOfVariation(xs: number[]): number {
  const m = mean(xs);
  if (m === 0) return 0;
  return stddev(xs) / Math.abs(m);
}

/** 0–100 consistency score: lower CV → higher score. */
export function consistencyScore(xs: number[]): number {
  if (xs.length < 2) return 0;
  const cv = coefficientOfVariation(xs);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(cv, 1)))));
}

export function bestWorst(scores: number[]): { best: number; worst: number } {
  if (!scores.length) return { best: 0, worst: 0 };
  let best = 0, worst = 0;
  scores.forEach((s, i) => { if (s > scores[best]) best = i; if (s < scores[worst]) worst = i; });
  return { best, worst };
}
