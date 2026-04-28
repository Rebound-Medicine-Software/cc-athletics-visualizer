// Compares the most recent half of a series to the previous half and returns
// the percentage change. Returns null when comparison is impossible.
export function periodDelta(values: number[]): number | null {
  if (!values || values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const prev = values.slice(0, mid);
  const curr = values.slice(mid);
  const sum = (a: number[]) => a.reduce((s, v) => s + (v ?? 0), 0);
  const prevSum = sum(prev);
  const currSum = sum(curr);
  if (prevSum === 0 && currSum === 0) return 0;
  if (prevSum === 0) return 100;
  return Math.round(((currSum - prevSum) / prevSum) * 1000) / 10;
}

// Same as periodDelta but compares averages (better for engagement / risk scores).
export function periodAvgDelta(values: number[]): number | null {
  if (!values || values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + (v ?? 0), 0) / a.length : 0);
  const prev = avg(values.slice(0, mid));
  const curr = avg(values.slice(mid));
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export function shortMonthDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}
