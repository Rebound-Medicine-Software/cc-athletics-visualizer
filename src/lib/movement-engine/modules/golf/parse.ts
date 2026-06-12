import type { MovementSession, ForceSample } from '../../core/types';
import { detectFormat } from '../../core/formatRegistry';
import { golfFormats } from './detectFormat';

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.split(',');
}

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const TIME_KEYS = ['time', 't', 'timestamp', 'timesec', 'times', 'timems'];
const LEFT_KEYS = [
  'left', 'leftforce', 'lforce', 'fzleft', 'leftfz', 'leftz', 'leadfoot', 'leftverticalforce',
  'leftvgrf', 'fl', 'leftfoot', 'leftn',
];
const RIGHT_KEYS = [
  'right', 'rightforce', 'rforce', 'fzright', 'rightfz', 'rightz', 'trailfoot', 'rightverticalforce',
  'rightvgrf', 'fr', 'rightfoot', 'rightn',
];
const COMBINED_KEYS = ['total', 'combined', 'fz', 'sum', 'vgrf', 'verticalforce', 'totalforce'];

function pickIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h === c);
    if (i >= 0) return i;
  }
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

export async function parseGolfFile(input: File | string, filename?: string): Promise<MovementSession> {
  const text = typeof input === 'string' ? input : await input.text();
  const name = filename ?? (typeof input === 'string' ? 'pasted.csv' : input.name);
  const format = detectFormat(text, name, golfFormats);

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Find header row: first row containing letters and at least 2 columns
  let headerIdx = lines.findIndex((l) => {
    const parts = splitLine(l);
    return parts.length >= 2 && /[a-z]/i.test(l);
  });
  if (headerIdx < 0) headerIdx = 0;

  const rawHeaders = splitLine(lines[headerIdx]).map(normaliseHeader);
  const tIdx = pickIndex(rawHeaders, TIME_KEYS);
  let lIdx = pickIndex(rawHeaders, LEFT_KEYS);
  let rIdx = pickIndex(rawHeaders, RIGHT_KEYS);
  const cIdx = pickIndex(rawHeaders, COMBINED_KEYS);

  // Fall back: assume col0=time, col1=left, col2=right
  if (tIdx < 0 && lIdx < 0 && rIdx < 0 && rawHeaders.length >= 3) {
    return parseNumericFallback(lines.slice(headerIdx), format?.id ?? 'generic', name);
  }

  const samples: ForceSample[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    if (parts.length < 2) continue;
    const tRaw = tIdx >= 0 ? parts[tIdx] : String(i - headerIdx - 1);
    const t = parseFloat(tRaw);
    if (!Number.isFinite(t)) continue;
    let left = lIdx >= 0 ? parseFloat(parts[lIdx]) : NaN;
    let right = rIdx >= 0 ? parseFloat(parts[rIdx]) : NaN;
    let total = cIdx >= 0 ? parseFloat(parts[cIdx]) : NaN;
    if (!Number.isFinite(left) && Number.isFinite(total)) left = total / 2;
    if (!Number.isFinite(right) && Number.isFinite(total)) right = total / 2;
    if (!Number.isFinite(total)) total = (left || 0) + (right || 0);
    if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
    samples.push({ t, left, right, total });
  }

  return finaliseSession(samples, format?.id ?? 'generic', name);
}

function parseNumericFallback(lines: string[], formatId: string, filename: string): MovementSession {
  const samples: ForceSample[] = [];
  for (const line of lines) {
    const parts = splitLine(line).map((p) => parseFloat(p));
    if (parts.length < 3 || parts.some((p) => !Number.isFinite(p))) continue;
    const [t, left, right] = parts;
    samples.push({ t, left, right, total: left + right });
  }
  return finaliseSession(samples, formatId, filename);
}

function finaliseSession(samples: ForceSample[], formatId: string, filename: string): MovementSession {
  // Time normalisation: if t looks like ms (large numbers), convert to seconds.
  if (samples.length >= 2) {
    const dt = samples[1].t - samples[0].t;
    if (dt > 1) {
      // Probably ms — convert.
      const t0 = samples[0].t;
      samples.forEach((s) => { s.t = (s.t - t0) / 1000; });
    } else {
      const t0 = samples[0].t;
      samples.forEach((s) => { s.t -= t0; });
    }
  }
  const sampleRateHz = samples.length >= 2
    ? Math.round(1 / Math.max(samples[1].t - samples[0].t, 1e-6))
    : 1000;
  // Body mass estimate: median total during longest quiet window of first 1.0s.
  const quiet = samples.filter((s) => s.t < 1.0).map((s) => s.total);
  const bm = quiet.length ? median(quiet) / 9.81 : undefined;
  return {
    id: `golf-${Date.now()}`,
    moduleId: 'golf_swing',
    sourceFile: filename,
    format: formatId,
    bodyMassKg: bm && bm > 30 && bm < 200 ? Number(bm.toFixed(1)) : undefined,
    sampleRateHz,
    samples,
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
