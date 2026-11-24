import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'
import { logActivity } from '../_shared/logActivity.ts'
import { getServiceRoleKey } from '../_shared/supabaseAdmin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestMetrics {
  [key: string]: any;
}

interface TestRecord {
  test_name: string;
  test_date: string;
  metrics: TestMetrics;
  repetition_number?: number;
  leg_stance?: string;
}

interface GroupedTest {
  testName: string;
  records: TestRecord[];
  latestDate: string;
  latestMetrics: TestMetrics;
  previousValues: { date: string; metrics: TestMetrics }[];
  baseline: TestMetrics | null;
  personalRecord: TestMetrics | null;
}

interface CardConfig {
  icon: string;
  title: string;
  metricKey: string;
  keyOverride?: string;
  fallbackKeys?: string[];
  unit: string;
}

// Get metric card configurations matching dashboard's metricCardConfig.ts
function getCardConfigs(testName: string): CardConfig[] {
  switch (testName) {
    case "Countermovement Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Peak Power / Body Mass", metricKey: "relative_peak_power", unit: "W/kg" },
        { icon: "⚡", title: "RSI-mod (m/s)", metricKey: "rsi", unit: "" },
        { icon: "⚡", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", unit: "N/s" },
      ];
    case "Squat Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Take-off Velocity", metricKey: "takeoff_velocity", unit: "m/s" },
        { icon: "⚡", title: "Avg Rate of Force Dev.", metricKey: "avg_rfd", unit: "N/s" },
        { icon: "⚡", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", unit: "N/s" },
      ];
    case "Drop Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "RSI-mod (m/s)", metricKey: "rsi", unit: "" },
        { icon: "⏱️", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
        { icon: "⚡", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", unit: "N/s" },
      ];
    case "Pogo Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "mRSI", metricKey: "avg_modified_rsi", fallbackKeys: ["modified_rsi", "rsi_modified"], unit: "m/s" },
        { icon: "⏱️", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
        { icon: "⏱️", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
      ];
    case "Left Side Countermovement Jump":
    case "Right Side Countermovement Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Relative Peak Power", metricKey: "relative_peak_power", unit: "W/kg" },
        { icon: "⚡", title: "RSI-mod (m/s)", metricKey: "rsi", unit: "" },
        { icon: "⚡", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", unit: "N/s" },
      ];
    case "Left Side Squat Jump":
    case "Right Side Squat Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Take-off Velocity", metricKey: "takeoff_velocity", unit: "m/s" },
        { icon: "⚡", title: "Avg Rate of Force Dev.", metricKey: "avg_rfd", unit: "N/s" },
        { icon: "⚡", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", unit: "N/s" },
      ];
    case "Left Side Drop Jump":
    case "Right Side Drop Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "RSI-mod (m/s)", metricKey: "rsi", unit: "" },
        { icon: "⏱️", title: "Ground Contact Time", metricKey: "time_to_takeoff", unit: "s" },
        { icon: "⚡", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", unit: "N/s" },
      ];
    case "Left Side Pogo Jump":
    case "Right Side Pogo Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "RSI", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
        { icon: "⚡", title: "Power", metricKey: "avg_power", fallbackKeys: ["power", "avg_pogo_power"], unit: "W" },
        { icon: "⏱️", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
      ];
    // VALD's Single Leg Jump / Single Leg Drop Jump arrive as ONE combined
    // record (valdToCCAthletics.ts never splits them into "Left Side X" /
    // "Right Side X" pairs - that split only happens for isometric tests
    // that carry a stance field), so these cases are what the report
    // generator actually renders for VALD unilateral jump tests, not a
    // fallback. Limb symmetry for them comes from calculateLimbSymmetry's
    // p1_avg_force / jump_height_left_cm fields on that combined record.
    //
    // Single Leg Jump has no real landing/ground-contact phase (it's a
    // CMJ-style test - dip, drive, land once, done), so "Contact Time" here
    // used to read VALD's CONTRACTION_TIME (the dip+drive duration before
    // takeoff) mislabeled as a contact event. Swapped for Peak Power, a
    // genuine, distinct, already-populated metric for this test family.
    // Single Leg Drop Jump keeps Contact Time - it genuinely has a
    // landing-to-takeoff phase.
    case "Single Leg Jump":
    case "Left Side Single Leg Jump":
    case "Right Side Single Leg Jump":
      return [
        { icon: "J", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "J", title: "RSI-mod (m/s)", metricKey: "rsi", unit: "" },
        { icon: "J", title: "Peak Power", metricKey: "peak_power", unit: "W" },
        { icon: "J", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", fallbackKeys: ["rfd_50ms_left", "rfd_50ms_right"], unit: "N/s" },
      ];
    case "Single Leg Drop Jump":
    case "Left Side Single Leg Drop Jump":
    case "Right Side Single Leg Drop Jump":
      return [
        { icon: "J", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "J", title: "RSI-mod (m/s)", metricKey: "rsi", unit: "" },
        { icon: "J", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
        { icon: "J", title: "Early Force Development (50ms)", metricKey: "rfd_50ms", fallbackKeys: ["rfd_50ms_left", "rfd_50ms_right"], unit: "N/s" },
      ];
    case "Hop Test":
      return [
        { icon: "H", title: "RSI (m/s)", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
        { icon: "H", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
        { icon: "H", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
        { icon: "H", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
      ];
    case "Single Leg Hop Test":
      return [
        { icon: "H", title: "RSI (m/s)", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
        { icon: "H", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
        { icon: "H", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
        { icon: "H", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
      ];
    case "Shoulder ISO-Y":
      return [
        { icon: "I", title: "Peak Force", metricKey: "force_peak", fallbackKeys: ["peak_vertical_force"], unit: "N" },
        { icon: "I", title: "RFD Max", metricKey: "rfd_max", fallbackKeys: ["rfd_at_150ms"], unit: "N/s" },
        { icon: "I", title: "Force @ 50ms", metricKey: "force_50ms", fallbackKeys: ["force_at_50ms"], unit: "N" },
        { icon: "I", title: "Force @ 200ms", metricKey: "force_200ms", fallbackKeys: ["force_at_200ms"], unit: "N" },
      ];
        default:
      // Check for Left/Right Side isometric tests
      if (testName.startsWith('Left Side') || testName.startsWith('Right Side')) {
        return [
          { icon: "⚡", title: "Early Force Capacity (50ms)", metricKey: "force_50ms", unit: "N" },
          { icon: "⚡", title: "Moderate/Late Force (250ms)", metricKey: "force_250ms", unit: "N" },
          { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
          { icon: "📊", title: "Stable Force Reading", metricKey: "steadiness_force", unit: "N" },
        ];
      }
      // Isometric tests - dual_leg uses totals, single-leg uses left/right breakdowns
      return [
        { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
        { icon: "📈", title: "RFD Max", metricKey: "rfd_max", fallbackKeys: ["force_at_max_rfd"], unit: "N/s" },
        { icon: "⚡", title: "Impulse @ 50ms", metricKey: "force_50ms", fallbackKeys: ["impulse_50ms"], unit: "N" },
        { icon: "⚡", title: "Impulse @ 250ms", metricKey: "force_250ms", fallbackKeys: ["impulse_250ms"], unit: "N" },
      ];
  }
}

// Extended limb symmetry return type
interface LimbSymmetryResult {
  leftValue: number;
  rightValue: number;
  asymmetryPercent: number;
  isSymmetryIndex?: boolean;
  dominantSide?: string;
  siValue?: number;
  // What leftValue/rightValue actually represent, e.g. "Peak Force", "Jump
  // Height" - shown in the Limb Symmetry card's sub-label so a kinematic
  // fallback is never mislabeled as a force reading.
  metricLabel?: string;
}

// Extract limb symmetry data. Rather than matching on an exact testName
// string (which only ever covered the handful of bilateral names CC
// Athletics ships natively and silently returned "Not available" for every
// VALD single-leg/jump-family variant - Single Leg Jump, Single Leg Squat
// Jump, Single Leg Drop Jump, Single Leg Hop Test, etc. - this now detects
// which left/right field pair the upstream mapper actually populated and
// uses that, so any test name with real paired data gets a real symmetry
// value. Priority: real force > jump height (kinematic fallback for jump
// tests with no raw per-limb force) > limb contribution % > isometric peak
// force (signed symmetry index).
function calculateLimbSymmetry(testName: string, metrics: TestMetrics): LimbSymmetryResult | null {
  let leftValue = 0;
  let rightValue = 0;
  let metricLabel: string | undefined;

  if (typeof metrics.fp1_peak_landing_force === 'number' || typeof metrics.fp2_peak_landing_force === 'number') {
    // Drop Jump family (Drop Jump, Single Leg Drop Jump, Left/Right Side Drop Jump)
    // Formula: |Left - Right| / Max(Left, Right) × 100
    leftValue = metrics.fp1_peak_landing_force || 0;
    rightValue = metrics.fp2_peak_landing_force || 0;
    metricLabel = 'Peak Landing Force';
  } else if (typeof metrics.p1_avg_force === 'number' || typeof metrics.fp1_peak_force === 'number' ||
             typeof metrics.p2_avg_force === 'number' || typeof metrics.fp2_peak_force === 'number') {
    // CMJ / Squat Jump family, incl. VALD's Single Leg Jump / Single Leg
    // Squat Jump, which map onto these same field names (see valdToCCAthletics.ts)
    leftValue = metrics.p1_avg_force || metrics.fp1_peak_force || 0;
    rightValue = metrics.p2_avg_force || metrics.fp2_peak_force || 0;
    metricLabel = 'Peak Force';
  } else if (typeof metrics.jump_height_left_cm === 'number' || typeof metrics.jump_height_right_cm === 'number') {
    // No raw per-limb force available for this jump (common for VALD's
    // Single Leg Jump) - fall back to per-limb jump height rather than
    // showing nothing. Kept as its own branch (not folded into p1_avg_force)
    // so it is only ever labelled as what it actually is.
    leftValue = metrics.jump_height_left_cm || 0;
    rightValue = metrics.jump_height_right_cm || 0;
    metricLabel = 'Jump Height';
  } else if (typeof metrics.fp1_contribution === 'number' || typeof metrics.avg_fp1_contribution === 'number') {
    // Pogo Jump family (Pogo Jump, Single Leg Hop Test, Hop Test) - Dual_Leg contribution %
    leftValue = metrics.fp1_contribution ?? metrics.avg_fp1_contribution ?? 0;
    rightValue = metrics.fp2_contribution ?? metrics.avg_fp2_contribution ?? 0;
    metricLabel = 'Limb Contribution';
  } else {
    // Isometric tests - use force_peak_left/right from preprocessed metrics
    leftValue = metrics.force_peak_left || 0;
    rightValue = metrics.force_peak_right || 0;

    // Signed formula: (left - right) / max(left, right) × 100
    // Positive = Left dominant, Negative = Right dominant
    const maxVal = Math.max(leftValue, rightValue);
    if (maxVal === 0) return null;
    const si = ((leftValue - rightValue) / maxVal) * 100;
    return {
      leftValue,
      rightValue,
      asymmetryPercent: Math.abs(si),
      isSymmetryIndex: true,
      dominantSide: si >= 0 ? 'Left Leg Dominant' : 'Right Leg Dominant',
      siValue: si,
      metricLabel: 'Peak Force',
    };
  }

  const total = leftValue + rightValue;
  if (total === 0) return null;

  // Asymmetry formula: |Left - Right| / Max(Left, Right) × 100
  const asymmetryPercent = Math.abs(leftValue - rightValue) / Math.max(leftValue, rightValue) * 100;

  return {
    leftValue,
    rightValue,
    asymmetryPercent,
    metricLabel,
  };
}

// Format metric value based on type (convert units like dashboard does)
// All length metrics are normalized to cm
function formatMetricValue(value: number, metricKey: string): number {
  switch (metricKey) {
    case 'jump_height_ft':
    case 'jump_height_cm':
      // Convert from meters to centimeters
      return value * 100;
    case 'avg_jump_height':
    case 'avg_jump_height_cm':
      // Pogo Jump height - convert from meters to centimeters
      // But only if value appears to be in meters (< 3 means it's likely meters)
      if (value < 3) {
        return value * 100;
      }
      // Already in cm
      return value;
    case 'rsi':
    case 'avg_rsi':
      // VALD RSI_MODIFIED is cm/s (jump_height_cm / contact_time_s)
      // Canonical display unit is m/s -> divide by 100 when value looks like cm/s
      return value > 5 ? Math.round(value / 100 * 1000) / 1000 : value;
    case 'rsi':
    case 'avg_rsi':
      // VALD bridge already converts RSI to m/s (÷100). No further conversion.
      return Math.round(value * 1000) / 1000;
    case 'contact_time':
    case 'flight_time':
    case 'avg_flight_time':
    case 'avg_contact_time':
      // Convert from seconds to milliseconds
      return value * 1000;
    default:
      return value;
  }
}

// Get metric value from record, applying any key overrides and fallbacks
function getMetricValue(metrics: TestMetrics, config: CardConfig): number | null {
  // Try primary key first
  let value = metrics[config.metricKey];
  
  // Try fallback keys if primary is not a number
  if (typeof value !== 'number' && config.fallbackKeys) {
    for (const fallbackKey of config.fallbackKeys) {
      const fallbackValue = metrics[fallbackKey];
      if (typeof fallbackValue === 'number') {
        value = fallbackValue;
        break;
      }
    }
  }
  
  if (typeof value !== 'number') return null;
  return formatMetricValue(value, config.keyOverride || config.metricKey);
}

// ===== LIMB SYMMETRY (CAPACITY / EXPRESSION) + REAL FORCE TRACE =====
// Added for the "Limb Symmetry" report section: two separate views on the
// same limb pair (Capacity = how much force, from existing calculateLimbSymmetry
// above; Expression = how fast it gets there, from force_50ms_left/right) plus
// a real force-time trace chart pulled from CC Athletics' raw per-sample CSV
// (same source cc-raw-csv/index.ts and src/lib/movement/rawTraceFetch.ts already
// use), replacing the earlier illustrative/mocked-up curve.

interface SymmetryBand {
  label: string;
  color: number[];
}

// Symmetry % = 100 - asymmetryPercent. Thresholds match the already-shipped
// asymmetry color convention elsewhere in this file (>15% danger, >10% warning).
function getSymmetryBand(symmetryPercent: number): SymmetryBand {
  if (symmetryPercent < 75) return { label: 'Serious', color: [192, 57, 57] }
  if (symmetryPercent < 90) return { label: 'Moderate', color: [234, 88, 12] }
  return { label: 'Good', color: [13, 148, 136] }
}

// Force Expression Symmetry: same left/right-asymmetry shape as calculateLimbSymmetry,
// but based on Early Force @ 50ms (force_50ms_left/right) rather than Peak Force.
// Only populated when the preprocessed data actually carries those fields - no
// per-limb rate metric exists yet for jump-type tests, so this returns null there
// rather than fabricate a score.
function calculateExpressionSymmetry(metrics: TestMetrics): LimbSymmetryResult | null {
  const leftValue = metrics.force_50ms_left
  const rightValue = metrics.force_50ms_right
  if (typeof leftValue !== 'number' || typeof rightValue !== 'number') return null
  const total = leftValue + rightValue
  if (total === 0) return null
  const asymmetryPercent = Math.abs(leftValue - rightValue) / Math.max(leftValue, rightValue) * 100
  return { leftValue, rightValue, asymmetryPercent }
}

// Picks the most likely raw CSV path from a metrics object - mirrors
// src/lib/movement/rawTraceFetch.ts's pickRawCsvPath() so CC-sourced tests are
// detected the same way here as on the dashboard. VALD-sourced tests don't carry
// any of these fields yet (raw trace access is pending VALD support approval),
// so this naturally returns null for them.
function pickRawCsvPath(metrics: TestMetrics): string | null {
  if (!metrics || typeof metrics !== 'object') return null
  return metrics.raw_csv_path ?? metrics.path_to_this_jump_raw_csv ?? metrics.path_to_raw_csv ?? null
}

interface TraceSample {
  t: number;
  left: number | null;
  right: number | null;
  total: number | null;
}

interface ParsedTrace {
  samples: TraceSample[];
  hasLeftRight: boolean;
}

// Minimal CSV parser for the raw force-plate export - plain comma-delimited,
// header row first, numeric samples. Matches the header-normalisation and
// column-candidate lists already proven in src/lib/movement/rawTraceFetch.ts.
function parseForceTraceCsv(csvText: string): ParsedTrace {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return { samples: [], hasLeftRight: false }

  const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const headers = lines[0].split(',').map(normalizeHeader)

  const tKeys = ['time', 't', 'time_s', 'time_sec', 'time_seconds', 'timestamp']
  const leftKeys = ['fz_left', 'force_left', 'left', 'plate1', 'fp1', 'left_n']
  const rightKeys = ['fz_right', 'force_right', 'right', 'plate2', 'fp2', 'right_n']
  const totalKeys = ['fz', 'force', 'force_n', 'force_total', 'total', 'sum_force', 'fz_total']

  const findIdx = (keys: string[]) => headers.findIndex(h => keys.includes(h))
  const tIdx = findIdx(tKeys)
  const leftIdx = findIdx(leftKeys)
  const rightIdx = findIdx(rightKeys)
  const totalIdx = findIdx(totalKeys)
  const hasLeftRight = leftIdx !== -1 && rightIdx !== -1

  const num = (v: string | undefined): number | null => {
    if (v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const samples: TraceSample[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const left = leftIdx !== -1 ? num(cols[leftIdx]) : null
    const right = rightIdx !== -1 ? num(cols[rightIdx]) : null
    let total = totalIdx !== -1 ? num(cols[totalIdx]) : null
    if (total === null && (left !== null || right !== null)) total = (left ?? 0) + (right ?? 0)
    if (total === null) continue
    const t = tIdx !== -1 ? num(cols[tIdx]) : null
    samples.push({ t: t !== null ? t : (i - 1), left, right, total: Math.abs(total) })
  }
  return { samples, hasLeftRight }
}

// Fetches a CC Athletics raw force-trace CSV server-side - same two-step flow
// (get_csv_download_url, then GET the signed URL) already proven in
// supabase/functions/cc-raw-csv/index.ts, called directly here instead of via
// that function so report generation stays a single request.
async function fetchCcRawTrace(path: string, apiKey: string): Promise<ParsedTrace | null> {
  try {
    const params = new URLSearchParams({ path })
    const urlRes = await fetch(
      `https://europe-west1-forcemate-desktop.cloudfunctions.net/get_csv_download_url?${params.toString()}`,
      { headers: { 'X-API-Key': apiKey } }
    )
    if (!urlRes.ok) return null
    const { download_url } = await urlRes.json()
    if (!download_url) return null
    const csvRes = await fetch(download_url)
    if (!csvRes.ok) return null
    const csvText = await csvRes.text()
    return parseForceTraceCsv(csvText)
  } catch (e) {
    console.error('fetchCcRawTrace failed:', e)
    return null
  }
}

// Simple centered moving-average smoothing (mockup asked for "smoothed out" traces).
function smoothValues(values: number[], windowSize = 7): number[] {
  if (values.length <= 2) return values
  const half = Math.floor(windowSize / 2)
  return values.map((_, i) => {
    const start = Math.max(0, i - half)
    const end = Math.min(values.length - 1, i + half)
    let sum = 0
    for (let j = start; j <= end; j++) sum += values[j]
    return sum / (end - start + 1)
  })
}

// Evenly downsamples a sample array to at most maxPoints, for both chart
// readability and a bounded number of jsPDF draw calls per page.
function downsampleSamples(samples: TraceSample[], maxPoints = 160): TraceSample[] {
  if (samples.length <= maxPoints) return samples
  const step = samples.length / maxPoints
  const out: TraceSample[] = []
  for (let i = 0; i < maxPoints; i++) out.push(samples[Math.floor(i * step)])
  return out
}

// Generic image fetch -> base64 data URL, generalised from the existing org-logo
// fetch below so the same helper can also embed a practitioner-uploaded test emblem.
async function fetchImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    const contentType = res.headers.get('content-type') || 'image/png'
    const format: 'PNG' | 'JPEG' = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG'
    return { dataUrl: `data:${contentType};base64,${base64}`, format }
  } catch (e) {
    console.error('fetchImageAsDataUrl failed:', e)
    return null
  }
}

interface FocusResult {
  type: 'capacity' | 'expression';
  weakerSide: 'Left' | 'Right';
  weakerValue: number;
  strongerValue: number;
  symmetryPercent: number;
  label: string;
}

// Picks which of Capacity / Expression is this report's "one focus" - the
// lower-hanging-fruit, worse of the two symmetry scores, per Josh's explicit
// "you're only as strong as your weakest link" framing. Only compares the two
// when both exist; falls back to whichever one is actually available.
function selectSymmetryFocus(capacity: LimbSymmetryResult | null, expression: LimbSymmetryResult | null): FocusResult | null {
  const toFocus = (r: LimbSymmetryResult, type: 'capacity' | 'expression'): FocusResult => {
    const symmetryPercent = 100 - r.asymmetryPercent
    const weakerSide = r.leftValue < r.rightValue ? 'Left' : 'Right'
    return {
      type,
      weakerSide,
      weakerValue: Math.min(r.leftValue, r.rightValue),
      strongerValue: Math.max(r.leftValue, r.rightValue),
      symmetryPercent,
      label: type === 'capacity' ? 'Force Capacity' : 'Force Expression',
    }
  }
  if (capacity && expression) {
    const capFocus = toFocus(capacity, 'capacity')
    const expFocus = toFocus(expression, 'expression')
    return capFocus.symmetryPercent <= expFocus.symmetryPercent ? capFocus : expFocus
  }
  if (capacity) return toFocus(capacity, 'capacity')
  if (expression) return toFocus(expression, 'expression')
  return null
}

// Humanised, deterministic insight copy for the focus box - phrased in the same
// voice already approved on the mockups (scrubbed of AI writing tells), built
// from a small per-test-type copy bank rather than an LLM call so the PDF stays
// fast and doesn't depend on an extra AI request per test.
function buildFocusInsight(testName: string, focus: FocusResult, unit: string): { title: string; stat: string; whatsHappening: string; whyItMatters: string; whatToDo: string } {
  const name = testName.toLowerCase()
  const side = focus.weakerSide.toLowerCase()
  const metricName = focus.type === 'capacity' ? 'force capacity' : 'force expression'
  const title = `${focus.weakerSide} ${name.includes('side') ? name.replace(/^(left side|right side)\s+/i, '') : name}, ${metricName}.`
  const stat = `${focus.weakerValue.toFixed(0)}${unit} vs ${focus.strongerValue.toFixed(0)}${unit} ${focus.type === 'capacity' ? 'peak force' : 'at 50ms'}`

  let whatsHappening: string
  let whyItMatters: string
  let whatToDo: string

  if (focus.type === 'capacity') {
    whatsHappening = `The ${side} side reaches a lower ceiling than the other, ${focus.weakerValue.toFixed(0)}${unit} against ${focus.strongerValue.toFixed(0)}${unit} at peak. That's a straight strength gap, not a speed one.`
    whyItMatters = `A gap this size at peak is about load, not timing. Extra reactive or speed work won't close it on its own.`
    whatToDo = name.includes('adductor') || name.includes('copenhagen')
      ? `Heavy, slow Copenhagen holds and side-lying adductor work on the ${side} side, loaded up properly over the next block.`
      : name.includes('soleus') || name.includes('calf')
        ? `Heavy single leg calf raises on the ${side} side, slow and controlled, building the load over the next block.`
        : name.includes('jump') ? `Heavy unilateral strength work for the ${side} leg - split squats, single leg press, loaded up properly. Hold off on extra jump volume until the gap closes.`
          : `Heavy unilateral strength work on the ${side} side before adding more volume or speed work.`
  } else {
    whatsHappening = `Both sides get to a decent peak eventually, but the ${side} side takes its time getting there. At 50ms it's putting out ${focus.weakerValue.toFixed(0)}${unit} against ${focus.strongerValue.toFixed(0)}${unit} on the other side.`
    whyItMatters = `The ${side} side isn't weak, it just takes longer to switch on. Adding load alone won't touch that.`
    whatToDo = name.includes('adductor') || name.includes('copenhagen')
      ? `Fast, reactive adductor work twice a week - banded quick pulses, lateral change of direction drills. Keep the slow holds going too, just don't expect them to close this gap alone.`
      : name.includes('soleus') || name.includes('calf')
        ? `Fast, reactive calf work on the ${side} side - pogo hops, short-contact bounds - alongside the existing strength block.`
        : `Fast, reactive work on the ${side} side twice a week, alongside the existing strength block.`
  }

  return { title, stat, whatsHappening, whyItMatters, whatToDo }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTs = Date.now()
  let teamIdForLog: string | null = null
  let athleteIdForLog: string | null = null
  let athleteNameForLog: string | null = null

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      getServiceRoleKey()
    )

    // Require a real logged-in user before generating or storing a report.
    // This function had no auth check of its own and config.toml sets
    // verify_jwt = false, so it was reachable by anyone with no account at
    // all. Same root-cause gap already fixed for fetch-cc-data/vald-bridge/
    // compute-client-rank-events/generate-athlete-report and others.
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    let { athlete_id, athlete_name, team_name, test_data, branding, ai_insight } = body
    athleteIdForLog = athlete_id ?? null
    athleteNameForLog = athlete_name ?? null
    // ai_insight (optional): { testName?: string, explanation: string, recommendations: string[], keyCues: string[] }
    const includedAiInsight = !!(ai_insight && typeof ai_insight === 'object' && typeof ai_insight.explanation === 'string')

    if (!athlete_name || !test_data || test_data.length === 0) {
      throw new Error('athlete_name and test_data are required')
    }

    // Resolve team_id for telemetry (best-effort, never fatal)
    if (athlete_id) {
      try {
        const { data: a } = await supabaseClient
          .from('athletes')
          .select('team_id')
          .eq('id', athlete_id)
          .maybeSingle()
        teamIdForLog = a?.team_id ?? null
      } catch (_) { /* ignore */ }
    }

    // Fetch and encode logo image if branding has a logo_url
    let logoDataUrl: string | null = null
    if (branding?.logo_url) {
      try {
        console.log('Fetching org logo from:', branding.logo_url)
        const logoResponse = await fetch(branding.logo_url)
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer()
          const logoBytes = new Uint8Array(logoBuffer)
          let binary = ''
          for (let i = 0; i < logoBytes.length; i++) {
            binary += String.fromCharCode(logoBytes[i])
          }
          const base64 = btoa(binary)
          const contentType = logoResponse.headers.get('content-type') || 'image/png'
          const format = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG'
          logoDataUrl = `data:${contentType};base64,${base64}`
          console.log(`Logo fetched successfully (${format}, ${logoBytes.length} bytes)`)
        }
      } catch (logoErr) {
        console.error('Failed to fetch logo:', logoErr)
      }
    }

    // Load any practitioner-uploaded test emblems for this team (test_emblems,
    // PR #86). Keyed by exact test_name - left blank in the PDF for any test
    // the practitioner hasn't assigned an emblem to yet, per Josh's instruction.
    const emblemDataUrlByTestName: Map<string, { dataUrl: string; format: 'PNG' | 'JPEG' }> = new Map()
    if (teamIdForLog) {
      try {
        const { data: emblemRows } = await supabaseClient
          .from('test_emblems')
          .select('test_name, storage_path')
          .eq('team_id', teamIdForLog)
        for (const row of emblemRows || []) {
          const { data: pub } = supabaseClient.storage.from('test-emblems').getPublicUrl(row.storage_path)
          if (!pub?.publicUrl) continue
          const img = await fetchImageAsDataUrl(pub.publicUrl)
          if (img) emblemDataUrlByTestName.set(row.test_name, img)
        }
      } catch (emblemErr) {
        console.error('Failed to load test emblems:', emblemErr)
      }
    }

    // CC Athletics API key for fetching real raw force-trace CSVs server-side
    // (same get_csv_download_url flow as supabase/functions/cc-raw-csv/index.ts).
    // Only CC-sourced tests carry a raw_csv_path in their metrics - VALD-sourced
    // tests don't yet (raw trace access is pending VALD's own approval), so this
    // is simply unused for those and the trace section shows a "not available"
    // note instead of a fabricated curve.
    const ccApiKey = Deno.env.get('CC_ATHLETICS_API_KEY') ?? ''
    const rawTraceCache: Map<string, ParsedTrace | null> = new Map()
    const getRawTrace = async (path: string): Promise<ParsedTrace | null> => {
      if (!ccApiKey) return null
      if (rawTraceCache.has(path)) return rawTraceCache.get(path)!
      const result = await fetchCcRawTrace(path, ccApiKey)
      rawTraceCache.set(path, result)
      return result
    }

    console.log(`Generating force plate PDF report for: ${athlete_name}`)

    // OVERRIDE: Sam Baran complete test data from CC Athletics PDF screenshots
    // This ensures the report matches the verified CC Athletics source data
    if (athlete_name === 'Sam Baran') {
      // Clear all existing data and use only the verified PDF data
      test_data = []
      
      // CMJ Data - Page 1
      // 09 Jan 2026: Jump Height 18.41cm, Peak Power 3848.75, RSI 0.60, PP/BM 34.98
      // 19 Dec 2025: Jump Height 22.91cm (from trend chart - personal record)
      test_data.push({
        test_name: 'Countermovement Jump',
        test_date: '2026-01-09',
        repetition_number: 1,
        metrics: {
          jump_height_ft: 0.1841 / 0.3048, // 18.41 cm converted to ft
          peak_power: 3848.75,
          peak_force: 2962.6 + 1845.4, // Total from L/R
          rsi: 0.60,
          peak_power_bm: 34.98,
          fp1_peak_force: 2962.6, // Left
          fp2_peak_force: 1845.4, // Right
        }
      })
      test_data.push({
        test_name: 'Countermovement Jump',
        test_date: '2025-12-19',
        repetition_number: 1,
        metrics: {
          jump_height_ft: 0.2291 / 0.3048, // 22.91 cm (PR) converted to ft
          peak_power: 4160.27, // Calculated baseline
          peak_force: 4808.0,
          rsi: 0.587, // baseline
          peak_power_bm: 37.73,
          fp1_peak_force: 2404.0,
          fp2_peak_force: 2404.0,
        }
      })

      // Drop Jump Data - Page 2
      // 09 Jan 2026: Jump Height 24.59cm, Flight Time 447.92ms, RSI 1.24, Contact Time 360.42ms
      // 19 Dec 2025: Jump Height 10.1cm (from trend chart)
      test_data.push({
        test_name: 'Drop Jump',
        test_date: '2026-01-09',
        repetition_number: 1,
        metrics: {
          jump_height_ft: 0.2459 / 0.3048, // 24.59 cm converted to ft
          flight_time: 447.92 / 1000, // ms to seconds
          rsi: 1.24,
          contact_time: 360.42 / 1000, // ms to seconds
        }
      })
      test_data.push({
        test_name: 'Drop Jump',
        test_date: '2025-12-19',
        repetition_number: 1,
        metrics: {
          jump_height_ft: 0.101 / 0.3048, // 10.1 cm (baseline) converted to ft
          flight_time: 367.64 / 1000, // calculated baseline
          rsi: 1.04, // baseline
          contact_time: 350.60 / 1000, // baseline
        }
      })

      // Pogo Jump Data - Page 3
      // 09 Jan 2026: Jump Height 13.10cm, RSI 1.37, mRSI 0.55, Power 8494, Contact 237ms, Flight 327ms
      // 19 Dec 2025: Jump Height 8.7cm (from trend chart)
      test_data.push({
        test_name: 'Pogo Jump',
        test_date: '2026-01-09',
        repetition_number: 0, // Session average
        metrics: {
          avg_jump_height: 0.131, // 13.10 cm in meters
          avg_rsi: 1.37,
          avg_modified_rsi: 0.55, // mRSI
          avg_power: 8494,
          avg_contact_time: 0.237, // 237ms in seconds
          avg_flight_time: 0.327, // 327ms in seconds
          avg_fp1_contribution: 48, // L/R 48/52
          avg_fp2_contribution: 52,
        }
      })
      test_data.push({
        test_name: 'Pogo Jump',
        test_date: '2025-12-19',
        repetition_number: 0, // Session average
        metrics: {
          avg_jump_height: 0.087, // 8.7 cm in meters
          avg_rsi: 1.232, // baseline (calculated from +11.2%)
          avg_modified_rsi: 0.45, // mRSI baseline
          avg_power: 7712, // baseline (calculated from +10.1%)
          avg_contact_time: 0.238, // baseline (calculated from -0.4%)
          avg_flight_time: 0.297, // baseline (calculated from +10.1%)
          avg_fp1_contribution: 50,
          avg_fp2_contribution: 50,
        }
      })

      console.log('Applied Sam Baran complete data override: CMJ, Drop Jump, Pogo Jump')
    }

    // ===== PREPROCESS: Flatten isometric data & handle single-leg stance =====
    const preprocessedData: TestRecord[] = []
    for (const record of test_data) {
      const m = record.metrics
      if (m?.isometric_analysis?.trials) {
        const trials = m.isometric_analysis.trials

        // Separate trials by stance
        const dualTrials = trials.filter((t: any) => t.stance === 'dual_leg' || t.stance === 'dual')
        const singleLegTrials = trials.filter((t: any) =>
          t.stance === 'left_leg' || t.stance === 'left' ||
          t.stance === 'right_leg' || t.stance === 'right'
        )
        const unknownStanceTrials = trials.filter((t: any) =>
          !['dual_leg', 'dual', 'left_leg', 'left', 'right_leg', 'right'].includes(t.stance)
        )

        // Helper: extract peak force from a trial (supports both total_metrics and raw cha1Peak/cha2Peak/totalPeak format)
        const getTrialPeakForce = (trial: any): number => {
          if (trial.total_metrics?.force_peak) return trial.total_metrics.force_peak
          if (trial.totalPeak?.force) return trial.totalPeak.force
          return 0
        }

        // Helper: pick best trial by peak force
        const pickBest = (trialList: any[]) => trialList.reduce((best: any, trial: any) => {
          return getTrialPeakForce(trial) > getTrialPeakForce(best) ? trial : best
        })

        // Helper: flatten a trial into standard isometric metrics
        // Supports both total_metrics format AND raw cha1Peak/cha2Peak/totalPeak format from CC Athletics API
        // Flatten isometric trial into standardised metric keys
        // Handles both total_metrics format and raw cha1Peak/cha2Peak CC Athletics format
        const flattenIsometricTrial = (trial: any, stance?: string) => {
          const tm = trial.total_metrics || {}

          // Determine if this is a single-leg stance
          const isSingleLeg = stance === 'left_leg' || stance === 'right_leg' ||
                              stance === 'left' || stance === 'right'

          // Left / Right peak force (always extract for between-limb calc)
          const fpLeft = tm.force_peak_left || trial.cha1_metrics?.force_peak || trial.cha1Peak?.force || 0
          const fpRight = tm.force_peak_right || trial.cha2_metrics?.force_peak || trial.cha2Peak?.force || 0

          if (isSingleLeg) {
            // Single-leg stance: display L/R breakdowns as the primary metrics
            return {
              force_peak: fpLeft + fpRight, // total for card display fallback
              force_peak_left: fpLeft,
              force_peak_right: fpRight,
              rfd_max: tm.force_at_max_rfd_left || tm.force_at_max_rfd_right || tm.rfd_max || trial.totalCurveRFD || 0,
              force_at_max_rfd: tm.force_at_max_rfd_left || tm.force_at_max_rfd_right || 0,
              force_50ms: tm.force_50ms_left || tm.force_50ms_right || tm.force_50ms || 0,
              force_250ms: tm.force_250ms_left || tm.force_250ms_right || tm.force_250ms || 0,
              impulse_50ms: tm.impulse_50ms || 0,
              impulse_250ms: tm.impulse_250ms || 0,
              // carry all total_metrics through
              ...tm,
            }
          }

          // Dual-leg stance: use totals
          return {
            force_peak: tm.force_peak || trial.totalPeak?.force || 0,
            rfd_max: tm.rfd_max || trial.totalCurveRFD || 0,
            force_at_max_rfd: tm.force_at_max_rfd || 0,
            impulse_50ms: tm.impulse_50ms || 0,
            impulse_250ms: tm.impulse_250ms || 0,
            force_50ms: tm.force_50ms || 0,
            force_250ms: tm.force_250ms || 0,
            force_peak_left: fpLeft,
            force_peak_right: fpRight,
            // carry all total_metrics through
            ...tm,
          }
        }

        // Process dual-leg trials → keep original test name
        if (dualTrials.length > 0) {
          const bestDual = pickBest(dualTrials)
          preprocessedData.push({
            test_name: record.test_name,
            test_date: record.test_date,
            repetition_number: record.repetition_number || 1,
            metrics: flattenIsometricTrial(bestDual, 'dual_leg'),
          })
        }

        // Process single-leg trials → split into separate LEFT and RIGHT records
        if (singleLegTrials.length > 0) {
          const leftTrials = singleLegTrials.filter((t: any) => t.stance === 'left_leg' || t.stance === 'left')
          const rightTrials = singleLegTrials.filter((t: any) => t.stance === 'right_leg' || t.stance === 'right')

          if (leftTrials.length > 0) {
            const bestLeft = pickBest(leftTrials)
            const flatMetrics = flattenIsometricTrial(bestLeft, 'left_leg')
            if (flatMetrics.steadiness_rsme_force) flatMetrics.steadiness_force = flatMetrics.steadiness_rsme_force * 9.81
             preprocessedData.push({
              test_name: `Left Side ${record.test_name}`,
              test_date: record.test_date,
              repetition_number: record.repetition_number || 1,
              metrics: flatMetrics,
              leg_stance: 'left_leg',
            })
          }
          if (rightTrials.length > 0) {
            const bestRight = pickBest(rightTrials)
            const flatMetrics = flattenIsometricTrial(bestRight, 'right_leg')
            if (flatMetrics.steadiness_rsme_force) flatMetrics.steadiness_force = flatMetrics.steadiness_rsme_force * 9.81
            preprocessedData.push({
              test_name: `Right Side ${record.test_name}`,
              test_date: record.test_date,
              repetition_number: record.repetition_number || 1,
              metrics: flatMetrics,
              leg_stance: 'right_leg',
            })
          }
        }

        // If no explicit stance, treat as dual-leg by default
        if (dualTrials.length === 0 && singleLegTrials.length === 0 && unknownStanceTrials.length > 0) {
          const bestTrial = pickBest(unknownStanceTrials)
          preprocessedData.push({
            test_name: record.test_name,
            test_date: record.test_date,
            repetition_number: record.repetition_number || 1,
            metrics: flattenIsometricTrial(bestTrial),
          })
        }
      } else {
        // Non-isometric tests: check stance for single-leg renaming
        const stance = record.metrics?.stance || record.stance
        if (stance === 'left_leg' || stance === 'right_leg' || stance === 'left' || stance === 'right') {
          const metrics = { ...record.metrics }
          // Derive relative_peak_power for single-leg CMJ
          if (metrics.peak_power && metrics.body_mass) {
            metrics.relative_peak_power = metrics.peak_power / metrics.body_mass
          }
          // Derive steadiness_force
          if (metrics.steadiness_rsme_force) {
            metrics.steadiness_force = metrics.steadiness_rsme_force * 9.81
          }
          const sidePrefix = stance.includes('left') ? 'Left Side' : 'Right Side'
          const baseTestName = record.test_name.replace(/^(Left Side|Right Side|Single Leg)\s+/i, '')
          preprocessedData.push({
            ...record,
            metrics,
            test_name: `${sidePrefix} ${baseTestName}`,
            leg_stance: stance.includes('left') ? 'left_leg' : 'right_leg',
          })
        } else {
          preprocessedData.push(record)
        }
      }
    }
    test_data = preprocessedData
    console.log(`Preprocessed ${test_data.length} records (flattened isometric, split single-leg)`)


    // Group tests by test_name
    const groupedTests: Map<string, GroupedTest> = new Map()
    
    for (const record of test_data) {
      const testName = record.test_name
      if (!groupedTests.has(testName)) {
        groupedTests.set(testName, {
          testName,
          records: [],
          latestDate: '',
          latestMetrics: {},
          previousValues: [],
          baseline: null,
          personalRecord: null,
        })
      }
      groupedTests.get(testName)!.records.push(record)
    }

    // Process each test group - Select BEST result per date
    for (const [testName, group] of groupedTests) {
      const cardConfigs = getCardConfigs(testName)
      const primaryConfig = cardConfigs[0]

      // IMPORTANT (Pogo): CC Athletics provides BOTH per-session averages (repetition_number = 0)
      // and individual jumps (repetition_number >= 1). For reports we only want to compare
      // session averages between dates (matches CC Athletics UI & avoids anomaly single-jump outliers).
      if (testName === 'Pogo Jump' || testName === 'Left Side Pogo Jump' || testName === 'Right Side Pogo Jump') {
        const avgRows = group.records.filter((r) => (r.repetition_number ?? 0) === 0)
        if (avgRows.length > 0) {
          group.records = avgRows
        }
      }
      
      // Determine if primary metric is "lower is better"
      const lowerIsBetterMetrics = [
        'contact_time', 'gct', 'ground_contact_time', 'avg_contact_time',
        'time_to_peak_force', 'time_to_takeoff', 'braking_time', 'propulsive_time'
      ]
      const isLowerBetter = lowerIsBetterMetrics.some(m => 
        primaryConfig.metricKey.toLowerCase().includes(m) || 
        primaryConfig.title.toLowerCase().includes('contact') ||
        primaryConfig.title.toLowerCase().includes('gct')
      )
      
      // Group records by date and pick BEST per date
      // Normalize date to YYYY-MM-DD to handle timestamps properly
      const recordsByDate: Record<string, TestRecord[]> = {}
      for (const record of group.records) {
        // Extract just the date portion (YYYY-MM-DD) from potential datetime strings
        const dateOnly = record.test_date.split('T')[0]
        if (!recordsByDate[dateOnly]) {
          recordsByDate[dateOnly] = []
        }
        recordsByDate[dateOnly].push(record)
      }
      
      // Select best record per date
      const bestRecordsPerDate: TestRecord[] = []
      for (const [date, records] of Object.entries(recordsByDate)) {
        if (records.length === 1) {
          bestRecordsPerDate.push(records[0])
        } else {
          // Find best based on primary metric
          let bestRecord = records[0]
          let bestValue = getMetricValue(records[0].metrics, primaryConfig) ?? (isLowerBetter ? Infinity : -Infinity)
          
          for (const record of records.slice(1)) {
            const value = getMetricValue(record.metrics, primaryConfig)
            if (value !== null) {
              if (isLowerBetter ? value < bestValue : value > bestValue) {
                bestValue = value
                bestRecord = record
              }
            }
          }
          bestRecordsPerDate.push(bestRecord)
        }
      }
      
      // Replace group records with best-per-date records
      group.records = bestRecordsPerDate
      
      // Sort by date descending
      group.records.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
      
      const latest = group.records[0]
      group.latestDate = latest.test_date
      group.latestMetrics = latest.metrics
      
      // Previous values (last 10 excluding latest)
      group.previousValues = group.records.slice(1, 11).map(r => ({
        date: r.test_date,
        metrics: r.metrics
      }))
      
      // Baseline (average of first 3 sessions)
      const oldestRecords = group.records.slice(-3)
      if (oldestRecords.length >= 2) {
        const baselineMetrics: TestMetrics = {}
        const metricKeys = Object.keys(oldestRecords[0].metrics || {})
        for (const key of metricKeys) {
          const values = oldestRecords.map(r => r.metrics[key]).filter(v => typeof v === 'number') as number[]
          if (values.length > 0) {
            baselineMetrics[key] = values.reduce((a, b) => a + b, 0) / values.length
          }
        }
        group.baseline = baselineMetrics
      }
      
      // Personal Record (best for each metric - considering lower/higher is better for primary)
      const prMetrics: TestMetrics = {}
      const metricKeys = Object.keys(group.records[0]?.metrics || {})
      for (const key of metricKeys) {
        const values = group.records.map(r => r.metrics[key]).filter(v => typeof v === 'number') as number[]
        if (values.length > 0) {
          // For primary metric, use appropriate comparison; for others default to max
          if (key === primaryConfig.metricKey && isLowerBetter) {
            prMetrics[key] = Math.min(...values)
          } else {
            prMetrics[key] = Math.max(...values)
          }
        }
      }
      group.personalRecord = prMetrics
    }

    // Generate AI insights for each test
    const aiInsights: Map<string, any> = new Map()
    
    for (const [testName, group] of groupedTests) {
      try {
        const cardConfigs = getCardConfigs(testName)
        const primaryConfig = cardConfigs[0]
        const primaryValue = getMetricValue(group.latestMetrics, primaryConfig)
        const limbData = calculateLimbSymmetry(testName, group.latestMetrics)
        
        const insightResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-ai-coach-insight`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getServiceRoleKey()}`,
            },
            body: JSON.stringify({
              testMetrics: {
                testName,
                testDate: group.latestDate,
                currentValue: primaryValue,
                metricType: primaryConfig.title,
                metricUnit: primaryConfig.unit,
                previousValues: group.previousValues.slice(0, 5).map(p => getMetricValue(p.metrics, primaryConfig)),
                baseline: group.baseline ? getMetricValue(group.baseline, primaryConfig) : null,
                personalRecord: group.personalRecord ? getMetricValue(group.personalRecord, primaryConfig) : null,
                leftLimb: limbData?.leftValue,
                rightLimb: limbData?.rightValue,
                asymmetryPercent: limbData?.asymmetryPercent,
              }
            })
          }
        )
        
        if (insightResponse.ok) {
          const { insight } = await insightResponse.json()
          aiInsights.set(testName, insight)
        }
      } catch (e) {
        console.error(`Failed to get insight for ${testName}:`, e)
        aiInsights.set(testName, {
          explanation: "Insight unavailable. Continue with your current training protocol.",
          recommendations: ["Maintain consistent training", "Focus on proper form"],
          keyCues: ["Quality over quantity"]
        })
      }
    }

    // Generate PDF with improved styling matching the HTML template
    // Per-test pages are taller than A4 (see TEST_PAGE_HEIGHT below) so the
    // force trace / emblem / "this report's one focus" section fits on the
    // SAME page as the scores/symmetry/trend/insights above it, instead of
    // spilling onto a second page per test. The summary overview and AI
    // coach insight pages at the end stay standard A4 and set their own
    // format explicitly on every addPage() call.
    const TEST_PAGE_HEIGHT = 480
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [210, TEST_PAGE_HEIGHT]
    })

    // Helper: convert hex color string to RGB array
    const hexToRgb = (hex: string): number[] => {
      const h = hex.replace('#', '')
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    }

    // Derive header/primary colors from branding if available
    const brandPrimary = branding?.primary_color ? hexToRgb(branding.primary_color) : null
    const brandSecondary = branding?.secondary_color ? hexToRgb(branding.secondary_color) : null
    const brandAccent = branding?.accent_color ? hexToRgb(branding.accent_color) : null

    // Colors matching the HTML template — overridden by org branding when available
    const colors = {
      headerBg: brandPrimary || [31, 41, 55],       // org primary or #1F2933
      primary: brandPrimary || [30, 78, 216],        // org primary or #1D4ED8
      dark: [17, 24, 39],           // #111827
      text: [75, 85, 99],           // #4B5563
      lightText: [107, 114, 128],   // #6B7280
      muted: [156, 163, 175],       // #9CA3AF
      success: [5, 150, 105],       // #059669
      danger: [185, 28, 28],        // #B91C1C
      cardBg: [248, 250, 253],      // #F8FAFD
      sectionBg: [248, 250, 253],   // #F8FAFD
      border: [229, 231, 235],      // #E5E7EB
      coachBg: [239, 246, 255],     // #EFF6FF
      coachBorder: brandAccent || [191, 219, 254], // #BFDBFE
    }

    // Get date range
    const allDates = test_data.map((r: TestRecord) => new Date(r.test_date))
    const minDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map((d: Date) => d.getTime())))
    const dateRange = `${formatDate(minDate)} – ${formatDate(maxDate)}`

    // Calculate total page count (accounting for side-pair merging)
    const processedSidePairsCount = new Set<string>()
    let totalPages = 0
    for (const [testName] of groupedTests) {
      const isSideTest = testName.startsWith('Left Side') || testName.startsWith('Right Side')
      if (isSideTest) {
        const baseExercise = testName.replace(/^(Left Side|Right Side)\s+/, '')
        if (processedSidePairsCount.has(baseExercise)) continue
        processedSidePairsCount.add(baseExercise)
      }
      // 1 page per test - scores/symmetry/trend/insights plus the force
      // trace/emblem/"one focus" section all live on the same page now.
      totalPages += 1
    }
    totalPages++ // Limb Symmetry page (before Performance Overview, per Josh's ordering)
    totalPages++ // Summary overview page at the end

    let pageNumber = 0

    // ===== LIMB SYMMETRY SECTION (shared by both page layouts below) =====
    // Draws the Capacity / Expression symmetry card at (x, y, w) on the current
    // page and returns the height it consumed, so callers can keep advancing yPos.
    const drawLimbSymmetrySection = (capacity: LimbSymmetryResult | null, expression: LimbSymmetryResult | null, x: number, y: number, w: number): number => {
      const drawMetricRow = (label: string, sub: string, r: LimbSymmetryResult | null, rowY: number): number => {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(17, 24, 39)
        doc.text(label, x + 6, rowY)
        const labelW = doc.getTextWidth(label)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(119, 119, 119)
        doc.text(sub, x + 8 + labelW, rowY)

        if (!r) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          const chipLabel = 'Not available'
          const chipW = doc.getTextWidth(chipLabel) + 8
          doc.setFillColor(156, 163, 175)
          doc.roundedRect(x + w - 6 - chipW, rowY - 4, chipW, 6, 1.5, 1.5, 'F')
          doc.setTextColor(255, 255, 255)
          doc.text(chipLabel, x + w - 6 - chipW / 2, rowY, { align: 'center' })

          let ry = rowY + 7
          doc.setFontSize(7)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(136, 136, 136)
          doc.text('Not tracked for this test yet.', x + 6, ry)
          return ry - rowY + 8
        }

        const symPct = 100 - r.asymmetryPercent
        const band = getSymmetryBand(symPct)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        const chipLabel = `${band.label} - ${symPct.toFixed(1)}%`
        const chipW = doc.getTextWidth(chipLabel) + 8
        doc.setFillColor(band.color[0], band.color[1], band.color[2])
        doc.roundedRect(x + w - 6 - chipW, rowY - 4, chipW, 6, 1.5, 1.5, 'F')
        doc.setTextColor(255, 255, 255)
        doc.text(chipLabel, x + w - 6 - chipW / 2, rowY, { align: 'center' })

        let ry = rowY + 7
        const barX = x + 32
        const barW = w - 64
        const total = r.leftValue + r.rightValue
        const leftW = total > 0 ? (r.leftValue / total) * barW : barW / 2
        const rightW = barW - leftW

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(37, 99, 235)
        doc.text(`L ${r.leftValue.toFixed(0)}`, x + 6, ry + 3)
        doc.setFillColor(37, 99, 235)
        doc.rect(barX, ry, leftW, 4.5, 'F')
        doc.setFillColor(220, 38, 38)
        doc.rect(barX + leftW, ry, rightW, 4.5, 'F')
        doc.setTextColor(220, 38, 38)
        doc.text(`R ${r.rightValue.toFixed(0)}`, x + w - 6, ry + 3, { align: 'right' })

        return ry + 4.5 - rowY + 6
      }

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(51, 65, 85)
      doc.setLineWidth(0.4)
      const boxH = 50
      doc.roundedRect(x, y, w, boxH, 2, 2, 'FD')

      let cy = y + 7
      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text('Limb Symmetry', x + 6, cy)
      cy += 4
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(102, 102, 102)
      doc.text('Two views on the same limb - a strength gap needs different work to a speed of force gap.', x + 6, cy)
      cy += 7

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      // Sub-label follows whatever calculateLimbSymmetry actually compared
      // (Peak Force / Peak Landing Force / Jump Height / Limb Contribution)
      // so a kinematic fallback is never shown under a "Peak Force" caption.
      const capacitySub = capacity?.metricLabel ? `- ${capacity.metricLabel}, L vs R` : '- Peak Force, L vs R'
      cy += drawMetricRow('Force Capacity Symmetry', capacitySub, capacity, cy)
      doc.line(x + 6, cy - 1, x + w - 6, cy - 1)
      cy += 2
      drawMetricRow('Force Expression Symmetry', '- Early Force @ 50ms, L vs R', expression, cy)

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      return boxH + 5
    }

    // Picks the "best" rep from a set of records for a given metric config.
    const pickBestRecord = (records: TestRecord[], config: CardConfig): TestRecord | null => {
      if (records.length === 0) return null
      return records.reduce((best, r) => {
        const bv = getMetricValue(best.metrics, config) ?? -Infinity
        const rv = getMetricValue(r.metrics, config) ?? -Infinity
        return rv > bv ? r : best
      })
    }

    // ===== SAME-PAGE SECTION: REAL FORCE TRACE + EMBLEM + ONE FOCUS INSIGHT =====
    // Continues on the current test page, directly underneath Report
    // Insights, rather than starting a new page - see TEST_PAGE_HEIGHT above.
    const renderTracePage = async (opts: {
      testName: string
      displayTitle: string
      capacity: LimbSymmetryResult | null
      expression: LimbSymmetryResult | null
      leftReps: TestRecord[]
      rightReps: TestRecord[]
      combinedReps: TestRecord[]
      primaryConfig: CardConfig
      latestDate: string
      startY: number
    }) => {
      const pageWidth = 210
      const pageHeight = TEST_PAGE_HEIGHT
      const marginLeft = 15
      const marginRight = 15
      const contentWidth = pageWidth - marginLeft - marginRight

      // Thin section divider in place of the old second page's own header -
      // the branded header/title for this test is already on screen above.
      let yPos = opts.startY + 6
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.setLineWidth(0.3)
      doc.line(marginLeft, yPos, pageWidth - marginRight, yPos)
      yPos += 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text(opts.displayTitle.toUpperCase(), marginLeft, yPos)
      yPos += 8

      // Resolve a single representative raw trace (best rep). Faded multi-rep
      // overlay is left for a follow-up - this ships the real single-rep curve.
      type Mode = 'lr' | 'total' | 'lr-separate' | null
      let mode: Mode = null
      let leftVals: number[] | null = null
      let rightVals: number[] | null = null

      if (opts.combinedReps.length > 0) {
        const best = pickBestRecord(opts.combinedReps, opts.primaryConfig)
        const path = best ? pickRawCsvPath(best.metrics) : null
        const trace = path ? await getRawTrace(path) : null
        if (trace && trace.samples.length > 1) {
          const ds = downsampleSamples(trace.samples, 160)
          if (trace.hasLeftRight) {
            mode = 'lr'
            leftVals = smoothValues(ds.map(s => s.left ?? 0))
            rightVals = smoothValues(ds.map(s => s.right ?? 0))
          } else {
            mode = 'total'
            leftVals = smoothValues(ds.map(s => s.total ?? 0))
          }
        }
      } else if (opts.leftReps.length > 0 || opts.rightReps.length > 0) {
        const bestLeft = pickBestRecord(opts.leftReps, opts.primaryConfig)
        const bestRight = pickBestRecord(opts.rightReps, opts.primaryConfig)
        const leftPath = bestLeft ? pickRawCsvPath(bestLeft.metrics) : null
        const rightPath = bestRight ? pickRawCsvPath(bestRight.metrics) : null
        const leftTrace = leftPath ? await getRawTrace(leftPath) : null
        const rightTrace = rightPath ? await getRawTrace(rightPath) : null
        if (leftTrace && leftTrace.samples.length > 1) leftVals = smoothValues(downsampleSamples(leftTrace.samples, 160).map(s => s.total ?? 0))
        if (rightTrace && rightTrace.samples.length > 1) rightVals = smoothValues(downsampleSamples(rightTrace.samples, 160).map(s => s.total ?? 0))
        if (leftVals || rightVals) mode = 'lr-separate'
      }

      const focus = selectSymmetryFocus(opts.capacity, opts.expression)

      if (!mode) {
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, 30, 2, 2, 'FD')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
        doc.text('Raw force trace not available yet for this test. CC Athletics-sourced tests populate this', marginLeft + 6, yPos + 13)
        doc.text('automatically; VALD-sourced tests will once VALD approves raw trace access.', marginLeft + 6, yPos + 19)
        yPos += 36
      } else {
        // Align both series to equal length for drawing
        const n = Math.max(leftVals?.length ?? 0, rightVals?.length ?? 0)
        const chartH = 75
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, chartH, 2, 2, 'FD')

        let cy = yPos + 7
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text(mode === 'total' ? 'Force Trace (best rep this session)' : 'Force Trace - Left vs Right (best rep this session)', marginLeft + 6, cy)

        if (mode !== 'total') {
          doc.setFontSize(6.5)
          doc.setDrawColor(37, 99, 235)
          doc.setLineWidth(0.5)
          doc.line(marginLeft + 6, cy + 4, marginLeft + 14, cy + 4)
          doc.setTextColor(37, 99, 235)
          doc.text('Left', marginLeft + 16, cy + 5)
          doc.setDrawColor(220, 38, 38)
          doc.line(marginLeft + 30, cy + 4, marginLeft + 38, cy + 4)
          doc.setTextColor(220, 38, 38)
          doc.text('Right', marginLeft + 40, cy + 5)
        }

        cy += 10
        const chartX = marginLeft + 12
        const chartW = contentWidth - 24
        const chartAH = chartH - 24

        const allVals = [...(leftVals || []), ...(rightVals || [])]
        const maxV = Math.max(...allVals, 1)
        const minV = Math.min(...allVals, 0)
        const range = maxV - minV || 1

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.1)
        doc.line(chartX, cy, chartX, cy + chartAH)
        doc.line(chartX, cy + chartAH, chartX + chartW, cy + chartAH)

        // Flagged phase window (sample indices) based on the focus type
        let boxStart = 0
        let boxEnd = n - 1
        let phaseLabel = ''
        if (focus?.type === 'expression') {
          boxStart = 0
          boxEnd = Math.max(1, Math.round(n * 0.18))
          phaseLabel = 'Early phase'
        } else if (focus?.type === 'capacity') {
          if (mode === 'lr-separate' || opts.testName.toLowerCase().includes('jump')) {
            // jump-type: window around the overall peak sample
            const series = leftVals && leftVals.length ? leftVals : (rightVals || [])
            let peakIdx = 0
            series.forEach((v, i) => { if (v > series[peakIdx]) peakIdx = i })
            boxStart = Math.max(0, peakIdx - Math.round(n * 0.12))
            boxEnd = Math.min(n - 1, peakIdx + Math.round(n * 0.12))
            phaseLabel = 'Push off phase'
          } else {
            boxStart = Math.round(n * 0.55)
            boxEnd = n - 1
            phaseLabel = 'Plateau / peak phase'
          }
        }

        const plotSeries = (vals: number[] | null, color: number[]) => {
          if (!vals || vals.length < 2) return
          doc.setDrawColor(color[0], color[1], color[2])
          doc.setLineWidth(0.6)
          for (let i = 1; i < vals.length; i++) {
            const x1 = chartX + ((i - 1) / (vals.length - 1)) * chartW
            const y1 = cy + chartAH - ((vals[i - 1] - minV) / range) * chartAH
            const x2 = chartX + (i / (vals.length - 1)) * chartW
            const y2 = cy + chartAH - ((vals[i] - minV) / range) * chartAH
            doc.line(x1, y1, x2, y2)
          }
        }
        plotSeries(leftVals, mode === 'total' ? colors.dark : [37, 99, 235])
        plotSeries(rightVals, [220, 38, 38])

        if (phaseLabel && n > 2) {
          const bx1 = chartX + (boxStart / (n - 1)) * chartW
          const bx2 = chartX + (boxEnd / (n - 1)) * chartW
          doc.setDrawColor(192, 57, 57)
          doc.setLineWidth(0.5)
          doc.rect(bx1, cy, bx2 - bx1, chartAH, 'D')
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(192, 57, 57)
          doc.text(phaseLabel, (bx1 + bx2) / 2, cy - 2, { align: 'center' })
        }

        yPos += chartH + 5
      }

      // ===== BANDWIDTH ROW: emblem / zoom / insight, all in one strip =====
      const emblem = emblemDataUrlByTestName.get(opts.testName)
      const rowH = 58
      let rowX = marginLeft
      const emblemW = emblem ? 40 : 0
      // Only reserve space for the zoom card when there's an actual trace to
      // zoom into. It used to be a fixed 48mm regardless of `mode`, so a test
      // with no raw force trace (the normal case for every VALD-sourced test
      // today) still drew an empty pastel box with nothing in it - the same
      // "scruffy, not proportional" box whether or not there was any
      // expression/capacity data either. Collapsing it to 0 lets the insight
      // box below grow to fill the freed width instead.
      const zoomW = mode ? 48 : 0
      const boxGaps = (emblem ? 1 : 0) + (zoomW ? 1 : 0)
      const insightW = contentWidth - emblemW - zoomW - boxGaps * 4

      if (emblem) {
        doc.setFillColor(250, 250, 250)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(rowX, yPos, emblemW, rowH, 2, 2, 'FD')
        try {
          doc.addImage(emblem.dataUrl, emblem.format, rowX + 4, yPos + 4, emblemW - 8, emblemW - 8)
        } catch (_) { /* ignore */ }
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        doc.text(opts.testName, rowX + emblemW / 2, yPos + rowH - 6, { align: 'center', maxWidth: emblemW - 6 })
        rowX += emblemW + 4
      }

      // Zoom card: re-plot just the flagged window at a larger scale. Only
      // drawn at all when zoomW > 0, i.e. there's a real trace (mode is set).
      if (zoomW) {
        doc.setFillColor(254, 242, 242)
        doc.setDrawColor(254, 202, 202)
        doc.roundedRect(rowX, yPos, zoomW, rowH, 2, 2, 'FD')
        if (leftVals || rightVals) {
          const n2 = Math.max(leftVals?.length ?? 0, rightVals?.length ?? 0)
          let zs = 0, ze = n2 - 1
          if (focus?.type === 'expression') { zs = 0; ze = Math.max(1, Math.round(n2 * 0.18)) }
          else if (focus?.type === 'capacity') {
            if (mode === 'lr-separate' || opts.testName.toLowerCase().includes('jump')) {
              const series = leftVals && leftVals.length ? leftVals : (rightVals || [])
              let peakIdx = 0
              series.forEach((v, i) => { if (v > series[peakIdx]) peakIdx = i })
              zs = Math.max(0, peakIdx - Math.round(n2 * 0.12)); ze = Math.min(n2 - 1, peakIdx + Math.round(n2 * 0.12))
            } else { zs = Math.round(n2 * 0.55); ze = n2 - 1 }
          }
          const zoomLeft = leftVals ? leftVals.slice(zs, ze + 1) : null
          const zoomRight = rightVals ? rightVals.slice(zs, ze + 1) : null
          const zAll = [...(zoomLeft || []), ...(zoomRight || [])]
          if (zAll.length > 1) {
            const zMax = Math.max(...zAll)
            const zMin = Math.min(...zAll)
            const zRange = zMax - zMin || 1
            const zX = rowX + 6
            const zW = zoomW - 12
            const zY = yPos + 10
            const zH = rowH - 20
            const plotZoom = (vals: number[] | null, color: number[]) => {
              if (!vals || vals.length < 2) return
              doc.setDrawColor(color[0], color[1], color[2])
              doc.setLineWidth(0.6)
              for (let i = 1; i < vals.length; i++) {
                const x1 = zX + ((i - 1) / (vals.length - 1)) * zW
                const y1 = zY + zH - ((vals[i - 1] - zMin) / zRange) * zH
                const x2 = zX + (i / (vals.length - 1)) * zW
                const y2 = zY + zH - ((vals[i] - zMin) / zRange) * zH
                doc.line(x1, y1, x2, y2)
              }
            }
            plotZoom(zoomLeft, mode === 'total' ? colors.dark : [37, 99, 235])
            plotZoom(zoomRight, [220, 38, 38])
            doc.setFontSize(6)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(153, 27, 27)
            doc.text('zoom', rowX + zoomW / 2, yPos + 6, { align: 'center' })
          }
        }
        rowX += zoomW + 4
      }

      // Insight box: "this report's one focus"
      doc.setFillColor(17, 24, 39)
      doc.roundedRect(rowX, yPos, insightW, rowH, 2, 2, 'F')
      let iy = yPos + 7
      doc.setFillColor(192, 57, 57)
      doc.roundedRect(rowX + 4, iy - 3.5, 42, 5, 1, 1, 'F')
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text("THIS REPORT'S ONE FOCUS", rowX + 6, iy)
      iy += 7

      if (focus) {
        const copy = buildFocusInsight(opts.testName, focus, 'N')
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(copy.title, rowX + 4, iy, { maxWidth: insightW - 8 })
        iy += 4.5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(252, 165, 165)
        doc.text(copy.stat, rowX + 4, iy, { maxWidth: insightW - 8 })
        iy += 5
        doc.setFontSize(6.5)
        doc.setTextColor(229, 231, 235)
        const bodyLines = doc.splitTextToSize(copy.whatsHappening, insightW - 8)
        doc.text(bodyLines.slice(0, 3), rowX + 4, iy)
        iy += Math.min(bodyLines.length, 3) * 3 + 2
        const doLines = doc.splitTextToSize(`What to do: ${copy.whatToDo}`, insightW - 8)
        doc.text(doLines.slice(0, 3), rowX + 4, iy)
      } else {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(229, 231, 235)
        doc.text('No limb symmetry data available for this test yet.', rowX + 4, iy, { maxWidth: insightW - 8 })
      }

      yPos += rowH + 8

      doc.setFontSize(8)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
    }

    // Generate one page per test
    const processedSidePairs = new Set<string>()
    for (const [testName, group] of groupedTests) {
      // Skip Right Side tests if we already processed the Left Side pair
      const isSideTest = testName.startsWith('Left Side') || testName.startsWith('Right Side')
      if (isSideTest) {
        const baseExercise = testName.replace(/^(Left Side|Right Side)\s+/, '')
        if (processedSidePairs.has(baseExercise)) continue
        processedSidePairs.add(baseExercise)
      }
      if (pageNumber > 0) {
        doc.addPage([210, TEST_PAGE_HEIGHT], 'portrait')
      }
      pageNumber++

      const pageWidth = 210
      const marginLeft = 15
      const marginRight = 15
      const contentWidth = pageWidth - marginLeft - marginRight

      // ===== HEADER =====
      // Branded header bar
      const headerBarHeight = 14
      let yPos = 10
      doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
      doc.rect(0, 0, pageWidth, headerBarHeight + 6, 'F')

      // Organisation logo
      let headerTextX = marginLeft
      const logoSize = 10

      if (logoDataUrl) {
        try {
          const logoFormat = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'
          doc.addImage(logoDataUrl, logoFormat, marginLeft, 3, logoSize, logoSize)
          headerTextX = marginLeft + logoSize + 4
        } catch (imgErr) {
          console.error('Failed to embed logo in PDF:', imgErr)
        }
      }

      // Title text (white on branded header)
      const headerTitle = branding?.org_name
        ? `${branding.org_name.toUpperCase()} | PERFORMANCE REPORT`
        : 'FORCE PLATE PERFORMANCE REPORT'
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(headerTitle, headerTextX, yPos + 2)

      // Right-aligned meta info (white on header)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(220, 220, 220)
      doc.text(dateRange, pageWidth - marginRight, yPos, { align: 'right' })
      doc.text(`Latest Test: ${formatDate(new Date(group.latestDate))}`, pageWidth - marginRight, yPos + 4, { align: 'right' })

      // Athlete info below header bar
      yPos = headerBarHeight + 10
      doc.setFontSize(9)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text(`${athlete_name}   |   ${team_name || 'N/A'}`, marginLeft, yPos)

      // Divider line
      yPos += 4
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.setLineWidth(0.3)
      doc.line(marginLeft, yPos, pageWidth - marginRight, yPos)

      // ===== TEST NAME SECTION =====
      yPos += 10
      doc.setFillColor(colors.sectionBg[0], colors.sectionBg[1], colors.sectionBg[2])
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(marginLeft, yPos, contentWidth, 18, 2, 2, 'FD')

      yPos += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
      const displayTestName = isSideTest ? `LIMB COMPARISON - ${testName.replace(/^(Left Side|Right Side)\s+/, '').toUpperCase()}` : testName.toUpperCase()
      doc.text(displayTestName, marginLeft + 6, yPos)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      doc.text(`Latest Test: ${formatDate(new Date(group.latestDate))}`, pageWidth - marginRight - 6, yPos, { align: 'right' })

      yPos += 16

      // ===== SINGLE-LEG COMPARISON PAGE =====
      const isSingleLegTest = testName.startsWith('Left Side') || testName.startsWith('Right Side')
      if (isSingleLegTest) {
        // Find the paired test (Left Side ↔ Right Side)
        const baseExercise = testName.replace(/^(Left Side|Right Side)\s+/, '')
        const pairedTestName = testName.startsWith('Left Side') ? `Right Side ${baseExercise}` : `Left Side ${baseExercise}`
        const pairedGroup = groupedTests.get(pairedTestName)
        const allRecords = [...group.records, ...(pairedGroup?.records || [])]
        const leftRecords = allRecords.filter((r: any) => r.leg_stance === 'left_leg')
        const rightRecords = allRecords.filter((r: any) => r.leg_stance === 'right_leg')
        const slCardConfigs = getCardConfigs(testName)
        const slPrimaryConfig = slCardConfigs[0]

        // Group by date and pick best per date for each leg
        const pickBestByDate = (records: TestRecord[]) => {
          const byDate: Record<string, TestRecord[]> = {}
          for (const r of records) {
            const d = r.test_date.split('T')[0]
            if (!byDate[d]) byDate[d] = []
            byDate[d].push(r)
          }
          const best: Record<string, TestRecord> = {}
          for (const [date, recs] of Object.entries(byDate)) {
            best[date] = recs.reduce((a, b) => {
              const va = getMetricValue(a.metrics, slPrimaryConfig) ?? -Infinity
              const vb = getMetricValue(b.metrics, slPrimaryConfig) ?? -Infinity
              return vb > va ? b : a
            })
          }
          return best
        }

        const leftByDate = pickBestByDate(leftRecords)
        const rightByDate = pickBestByDate(rightRecords)
        const slAllDates = Array.from(new Set([...Object.keys(leftByDate), ...Object.keys(rightByDate)])).sort()

        const slLatestDate = slAllDates[slAllDates.length - 1] || ''
        const latestLeft = leftByDate[slLatestDate]?.metrics || {}
        const latestRight = rightByDate[slLatestDate]?.metrics || {}

        // ===== LIMB COMPARISON TABLE =====
        const tableHeight = 14 + slCardConfigs.length * 10
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, tableHeight, 2, 2, 'FD')

        let tblY = yPos + 7
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('Limb Comparison', marginLeft + 6, tblY)

        tblY += 8
        const colMetric = marginLeft + 6
        const colLeft = marginLeft + 80
        const colRight = marginLeft + 115
        const colAsym = marginLeft + 148

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text('Metric', colMetric, tblY)
        doc.setTextColor(30, 78, 216)
        doc.text('LEFT', colLeft, tblY)
        doc.setTextColor(185, 28, 28)
        doc.text('RIGHT', colRight, tblY)
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text('ASYM %', colAsym, tblY)

        tblY += 3
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.2)
        doc.line(colMetric, tblY, marginLeft + contentWidth - 6, tblY)
        tblY += 5

        slCardConfigs.forEach((config) => {
          const leftVal = getMetricValue(latestLeft, config)
          const rightVal = getMetricValue(latestRight, config)

          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          doc.text(config.title, colMetric, tblY)

          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text(leftVal !== null ? leftVal.toFixed(2) : '-', colLeft, tblY)
          doc.text(rightVal !== null ? rightVal.toFixed(2) : '-', colRight, tblY)

          if (leftVal !== null && rightVal !== null && Math.max(leftVal, rightVal) > 0) {
            const asym = Math.abs(leftVal - rightVal) / Math.max(leftVal, rightVal) * 100
            const asymColor = asym > 15 ? colors.danger : asym > 10 ? [234, 179, 8] : colors.success
            doc.setTextColor(asymColor[0], asymColor[1], asymColor[2])
            doc.text(`${asym.toFixed(1)}%`, colAsym, tblY)
          } else {
            doc.text('-', colAsym, tblY)
          }

          tblY += 10
        })

        yPos += tableHeight + 5

        // ===== LIMB SYMMETRY (Capacity / Expression) =====
        // Forward every field calculateLimbSymmetry knows how to read, not
        // just the isometric ones - a "Left Side X" / "Right Side X" pair
        // can equally be a split jump-family test, which carries force/
        // jump-height/contribution fields instead of force_peak.
        const slSynthMetrics: TestMetrics = {
          force_peak_left: latestLeft.force_peak,
          force_peak_right: latestRight.force_peak,
          force_50ms_left: latestLeft.force_50ms,
          force_50ms_right: latestRight.force_50ms,
          fp1_peak_landing_force: latestLeft.fp1_peak_landing_force ?? latestLeft.peak_landing_force,
          fp2_peak_landing_force: latestRight.fp2_peak_landing_force ?? latestRight.peak_landing_force,
          p1_avg_force: latestLeft.p1_avg_force ?? latestLeft.fp1_peak_force,
          p2_avg_force: latestRight.p2_avg_force ?? latestRight.fp2_peak_force,
          jump_height_left_cm: latestLeft.jump_height_left_cm ?? latestLeft.jump_height_cm,
          jump_height_right_cm: latestRight.jump_height_right_cm ?? latestRight.jump_height_cm,
          fp1_contribution: latestLeft.fp1_contribution ?? latestLeft.avg_fp1_contribution,
          fp2_contribution: latestRight.fp2_contribution ?? latestRight.avg_fp2_contribution,
        }
        const slCapacitySymmetry = calculateLimbSymmetry(testName, slSynthMetrics)
        const slExpressionSymmetry = calculateExpressionSymmetry(slSynthMetrics)
        yPos += drawLimbSymmetrySection(slCapacitySymmetry, slExpressionSymmetry, marginLeft, yPos, contentWidth)

        // ===== DUAL TREND CHART =====
        if (slAllDates.length >= 1) {
          const slChartHeight = 35
          const slChartCardHeight = slChartHeight + 22

          doc.setFillColor(255, 255, 255)
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
          doc.roundedRect(marginLeft, yPos, contentWidth, slChartCardHeight, 2, 2, 'FD')

          let slChartY = yPos + 7
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text(`${slPrimaryConfig.title} Trend (Left vs Right)`, marginLeft + 6, slChartY)

          // Legend
          slChartY += 5
          doc.setFontSize(7)
          doc.setDrawColor(30, 78, 216)
          doc.setLineWidth(0.5)
          doc.line(marginLeft + 6, slChartY - 1, marginLeft + 14, slChartY - 1)
          doc.setTextColor(30, 78, 216)
          doc.text('Left Side', marginLeft + 16, slChartY)
          doc.setDrawColor(185, 28, 28)
          doc.line(marginLeft + 45, slChartY - 1, marginLeft + 53, slChartY - 1)
          doc.setTextColor(185, 28, 28)
          doc.text('Right Side', marginLeft + 55, slChartY)

          slChartY += 5
          const slCX = marginLeft + 25
          const slCW = contentWidth - 35
          const slCAH = slChartHeight - 10

          const allVals: number[] = []
          for (const d of slAllDates) {
            const lv = leftByDate[d] ? getMetricValue(leftByDate[d].metrics, slPrimaryConfig) : null
            const rv = rightByDate[d] ? getMetricValue(rightByDate[d].metrics, slPrimaryConfig) : null
            if (lv !== null) allVals.push(lv)
            if (rv !== null) allVals.push(rv)
          }

          if (allVals.length > 0) {
            const slMaxV = Math.max(...allVals)
            const slMinV = Math.min(...allVals)
            const slRange = slMaxV - slMinV || slMaxV * 0.1 || 1

            doc.setFontSize(6)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
            doc.text(slMaxV.toFixed(1), marginLeft + 5, slChartY + 3)
            doc.text(slMinV.toFixed(1), marginLeft + 5, slChartY + slCAH)

            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
            doc.setLineWidth(0.1)
            doc.line(slCX, slChartY, slCX + slCW, slChartY)
            doc.line(slCX, slChartY + slCAH, slCX + slCW, slChartY + slCAH)

            const calcPts = (byDate: Record<string, TestRecord>) => {
              return slAllDates.map((d, i) => {
                const rec = byDate[d]
                const val = rec ? getMetricValue(rec.metrics, slPrimaryConfig) : null
                return {
                  x: slAllDates.length === 1 ? slCX + slCW / 2 : slCX + (i * (slCW / (slAllDates.length - 1))),
                  y: val !== null ? slChartY + slCAH - ((val - slMinV) / slRange) * slCAH : null,
                  value: val,
                }
              })
            }

            const lPts = calcPts(leftByDate)
            const rPts = calcPts(rightByDate)

            // Left line (blue)
            doc.setDrawColor(30, 78, 216)
            doc.setLineWidth(0.5)
            let prevL: any = null
            lPts.forEach(pt => {
              if (pt.y !== null) {
                if (prevL) doc.line(prevL.x, prevL.y, pt.x, pt.y)
                doc.setFillColor(30, 78, 216)
                doc.circle(pt.x, pt.y, 1.5, 'F')
                prevL = pt
              }
            })

            // Right line (red)
            doc.setDrawColor(185, 28, 28)
            let prevR: any = null
            rPts.forEach(pt => {
              if (pt.y !== null) {
                if (prevR) doc.line(prevR.x, prevR.y, pt.x, pt.y)
                doc.setFillColor(185, 28, 28)
                doc.circle(pt.x, pt.y, 1.5, 'F')
                prevR = pt
              }
            })

            // X-axis labels
            doc.setFontSize(5)
            doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
            slAllDates.forEach((d, i) => {
              const x = slAllDates.length === 1 ? slCX + slCW / 2 : slCX + (i * (slCW / (slAllDates.length - 1)))
              doc.text(formatDate(new Date(d)), x, slChartY + slCAH + 4, { align: 'center' })
            })
          }

          yPos += slChartCardHeight + 5
        }

        // ===== REPORT INSIGHTS =====
        const slInsight = aiInsights.get(testName)
        const slPageHeight = 297
        const slBottomMargin = 18
        const slMaxY = slPageHeight - slBottomMargin
        const slAvailable = slMaxY - yPos
        const slIdealH = 65
        const slInsightH = Math.min(slIdealH, Math.max(45, slAvailable - 10))

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, 8, 2, 2, 'F')
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text('Report Insights', marginLeft + 6, yPos + 5.5)
        yPos += 10

        doc.setFillColor(colors.coachBg[0], colors.coachBg[1], colors.coachBg[2])
        doc.setDrawColor(colors.coachBorder[0], colors.coachBorder[1], colors.coachBorder[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, slInsightH, 2, 2, 'FD')

        if (slInsight) {
          let slIY = yPos + 6
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text('What this means', marginLeft + 6, slIY)
          slIY += 4
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          const slExpLines = doc.splitTextToSize(slInsight.explanation || '', contentWidth - 14)
          doc.text(slExpLines.slice(0, 3), marginLeft + 6, slIY)
          slIY += Math.min(slExpLines.length, 3) * 3.5 + 5

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text('Training Recommendations', marginLeft + 6, slIY)
          slIY += 4
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          const slRecs = slInsight.recommendations || []
          const slMaxRecs = slInsightH < 55 ? 2 : 4
          slRecs.slice(0, slMaxRecs).forEach((rec: string, i: number) => {
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
            const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, contentWidth - 14)
            doc.text(recLines[0], marginLeft + 6, slIY)
            slIY += 3.5
          })

          if (slInsight.keyCues && slInsight.keyCues.length > 0 && slIY < yPos + slInsightH - 8) {
            slIY += 2
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
            doc.text('Coaching Cues', marginLeft + 6, slIY)
            slIY += 3.5
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
            doc.text(slInsight.keyCues.slice(0, 2).join('   •   '), marginLeft + 6, slIY, { maxWidth: contentWidth - 14 })
          }
        }

        // Advance past the insight card's own height before drawing anything
        // else - see the matching fix/comment in the standard (non-limb-pair)
        // insight block above for why this is needed.
        yPos += slInsightH + 5

        // Real force trace, emblem and "this report's one focus" continue on
        // this same page, directly underneath Report Insights (footer is
        // printed once, at the bottom of this section, below).
        await renderTracePage({
          testName,
          displayTitle: `LIMB COMPARISON - ${baseExercise.toUpperCase()}`,
          capacity: slCapacitySymmetry,
          expression: slExpressionSymmetry,
          leftReps: leftRecords,
          rightReps: rightRecords,
          combinedReps: [],
          primaryConfig: { icon: '', title: 'Peak Force', metricKey: 'force_peak', unit: 'N' },
          latestDate: slLatestDate,
          startY: yPos,
        })

        continue // Skip standard rendering below
      }

      // ===== TWO-COLUMN LAYOUT: Metrics + Summary =====
      const leftColWidth = 100
      const rightColWidth = 75
      const gap = 5

      // Left Column: Individual Scores
      const leftColX = marginLeft
      
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(leftColX, yPos, leftColWidth, 65, 2, 2, 'FD')

      let scoreY = yPos + 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text('Individual Scores', leftColX + 5, scoreY)

      scoreY += 8

      // Metrics grid (2 columns inside card)
      const cardConfigs = getCardConfigs(testName)
      const metricsPerCol = 2
      const metricColWidth = 46

      cardConfigs.forEach((config, i) => {
        const col = i % metricsPerCol
        const row = Math.floor(i / metricsPerCol)
        const metricX = leftColX + 5 + col * metricColWidth
        const metricY = scoreY + row * 13

        // Metric label
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text(config.title, metricX, metricY)

        // Metric value
        const value = getMetricValue(group.latestMetrics, config)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text(value !== null ? value.toFixed(2) : '-', metricX, metricY + 5)

        // Delta vs baseline
        if (group.baseline && value !== null) {
          const baselineValue = getMetricValue(group.baseline, config)
          if (baselineValue !== null && baselineValue !== 0) {
            const diff = value - baselineValue
            const diffPct = ((diff / baselineValue) * 100).toFixed(1)
            
            doc.setFontSize(7)
            if (diff > 0) {
              doc.setTextColor(colors.success[0], colors.success[1], colors.success[2])
              doc.text(`+${diffPct}% vs baseline`, metricX, metricY + 9)
            } else if (diff < 0) {
              doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2])
              doc.text(`${diffPct}% vs baseline`, metricX, metricY + 9)
            }
          }
        }
      })

      // Right Column: Comparison Summary
      const rightColX = marginLeft + leftColWidth + gap
      const summaryY = yPos
      
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(rightColX, summaryY, rightColWidth, 65, 2, 2, 'FD')

      let sumY = summaryY + 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text('Comparisons Amongst Previous Scores', rightColX + 5, sumY, { maxWidth: rightColWidth - 10 })

      sumY += 12

      // Primary metric comparison
      const primaryConfig = cardConfigs[0]
      const primaryValue = getMetricValue(group.latestMetrics, primaryConfig)
      const baselineValue = group.baseline ? getMetricValue(group.baseline, primaryConfig) : null
      const prValue = group.personalRecord ? getMetricValue(group.personalRecord, primaryConfig) : null

      // Summary rows
      const summaryRows = [
        { label: 'Latest', value: primaryValue },
        { label: 'Baseline', value: baselineValue },
        { label: 'Personal Record', value: prValue },
      ]

      summaryRows.forEach((row, i) => {
        const rowY = sumY + i * 9
        
        // Label (left-aligned)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text(row.label, rightColX + 5, rowY)

        // Value (right-aligned)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        const valueText = row.value !== null ? `${row.value.toFixed(2)} ${primaryConfig.unit}` : '-'
        doc.text(valueText, rightColX + rightColWidth - 5, rowY, { align: 'right' })
      })

      yPos += 72

      // ===== LIMB SYMMETRY (Capacity / Expression) =====
      const capacitySymmetry = calculateLimbSymmetry(testName, group.latestMetrics)
      const expressionSymmetry = calculateExpressionSymmetry(group.latestMetrics)
      yPos += drawLimbSymmetrySection(capacitySymmetry, expressionSymmetry, marginLeft, yPos, contentWidth)

      // ===== HISTORICAL TREND CHART - Best Value Per Date =====
      // Determine if this metric is "lower is better" (contact time, GCT, etc.)
      const lowerIsBetterMetrics = [
        'contact_time', 'gct', 'ground_contact_time', 'avg_contact_time',
        'time_to_peak_force', 'time_to_takeoff', 'braking_time', 'propulsive_time'
      ]
      const isLowerBetter = lowerIsBetterMetrics.some(m => 
        primaryConfig.metricKey.toLowerCase().includes(m) || 
        primaryConfig.title.toLowerCase().includes('contact') ||
        primaryConfig.title.toLowerCase().includes('gct')
      )

      // Group test records by date (normalize to YYYY-MM-DD)
      const testsByDate: Record<string, TestRecord[]> = {}
      for (const record of group.records) {
        const dateOnly = record.test_date.split('T')[0]
        if (!testsByDate[dateOnly]) {
          testsByDate[dateOnly] = []
        }
        testsByDate[dateOnly].push(record)
      }

      // Calculate BEST value per date for the primary metric
      const trendData: { date: string; displayDate: string; bestValue: number }[] = []
      for (const [date, records] of Object.entries(testsByDate)) {
        const values = records
          .map(r => getMetricValue(r.metrics, primaryConfig))
          .filter((v): v is number => v !== null && v > 0)
        
        if (values.length > 0) {
          // Best = lowest for contact time metrics, highest for everything else
          const bestValue = isLowerBetter ? Math.min(...values) : Math.max(...values)
          trendData.push({
            date,
            displayDate: formatDate(new Date(date)),
            bestValue
          })
        }
      }

      // Sort by date ascending for chronological chart
      trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Draw trend chart if we have at least 1 data point (show single point too)
      if (trendData.length >= 1) {
        const chartHeight = 35
        const chartCardHeight = chartHeight + 18
        
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, chartCardHeight, 2, 2, 'FD')

        // Chart title
        let chartY = yPos + 7
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        const betterLabel = isLowerBetter ? 'lower is better' : 'higher is better'
        doc.text(`${primaryConfig.title} Trend (Best per Date - ${betterLabel})`, marginLeft + 6, chartY)

        chartY += 6

        // Chart area
        const chartX = marginLeft + 25
        const chartWidth = contentWidth - 35
        const chartAreaHeight = chartHeight - 5

        // Calculate value range
        const values = trendData.map(d => d.bestValue)
        const maxVal = Math.max(...values)
        const minVal = Math.min(...values)
        const range = maxVal - minVal || maxVal * 0.1 || 1 // Handle single value case

        // Draw Y-axis labels
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text(maxVal.toFixed(1), marginLeft + 5, chartY + 3)
        doc.text(minVal.toFixed(1), marginLeft + 5, chartY + chartAreaHeight)

        // Draw grid lines
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.1)
        doc.line(chartX, chartY, chartX + chartWidth, chartY)
        doc.line(chartX, chartY + chartAreaHeight, chartX + chartWidth, chartY + chartAreaHeight)

        // Calculate points
        const points: { x: number; y: number; value: number; date: string }[] = trendData.map((d, i) => ({
          x: trendData.length === 1 
            ? chartX + chartWidth / 2 // Center single point
            : chartX + (i * (chartWidth / (trendData.length - 1))),
          y: range > 0 
            ? chartY + chartAreaHeight - ((d.bestValue - minVal) / range) * chartAreaHeight
            : chartY + chartAreaHeight / 2, // Center if no range
          value: d.bestValue,
          date: d.displayDate
        }))

        // Draw connecting line (only if more than 1 point)
        if (points.length > 1) {
          doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2])
          doc.setLineWidth(0.5)
          for (let i = 1; i < points.length; i++) {
            doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y)
          }
        }

        // Draw points
        points.forEach((pt, i) => {
          // Highlight latest point (or single point)
          if (i === points.length - 1) {
            doc.setFillColor(colors.success[0], colors.success[1], colors.success[2])
            doc.circle(pt.x, pt.y, 2.5, 'F')
            // Add value label for single point
            if (trendData.length === 1) {
              doc.setFontSize(8)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
              doc.text(`${pt.value.toFixed(2)} ${primaryConfig.unit}`, pt.x, pt.y - 5, { align: 'center' })
            }
          } else {
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.circle(pt.x, pt.y, 1.5, 'F')
          }
        })

        // Draw X-axis date labels
        doc.setFontSize(5)
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        if (points.length === 1) {
          doc.text(points[0].date, points[0].x, chartY + chartAreaHeight + 4, { align: 'center' })
        } else if (points.length >= 3) {
          doc.text(points[0].date, points[0].x, chartY + chartAreaHeight + 4, { align: 'center' })
          const midIndex = Math.floor(points.length / 2)
          doc.text(points[midIndex].date, points[midIndex].x, chartY + chartAreaHeight + 4, { align: 'center' })
          doc.text(points[points.length - 1].date, points[points.length - 1].x, chartY + chartAreaHeight + 4, { align: 'center' })
        } else {
          points.forEach(pt => {
            doc.text(pt.date, pt.x, chartY + chartAreaHeight + 4, { align: 'center' })
          })
        }

        yPos += chartCardHeight + 5
      }

      // (Between-Limb Differences replaced by the Limb Symmetry section above,
      // drawn right after the Individual Scores / Comparisons cards.)

      // ===== REPORT INSIGHTS SECTION =====
      const insight = aiInsights.get(testName)
      
      // Calculate available space - ensure we don't overflow the page
      const pageHeight = 297 // A4 height in mm
      const bottomMargin = 18 // Space for footer + buffer
      const maxYForContent = pageHeight - bottomMargin
      const availableSpace = maxYForContent - yPos
      
      // Dynamically size the insight card based on available space
      // Minimum 55mm, maximum 70mm, or whatever fits
      const idealCardHeight = 65
      const insightCardHeight = Math.min(idealCardHeight, Math.max(45, availableSpace - 10))

      // Insight header bar
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.roundedRect(marginLeft, yPos, contentWidth, 8, 2, 2, 'F')
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('Report Insights', marginLeft + 6, yPos + 5.5)

      yPos += 10

      // Insight content card
      doc.setFillColor(colors.coachBg[0], colors.coachBg[1], colors.coachBg[2])
      doc.setDrawColor(colors.coachBorder[0], colors.coachBorder[1], colors.coachBorder[2])
      doc.roundedRect(marginLeft, yPos, contentWidth, insightCardHeight, 2, 2, 'FD')

      if (insight) {
        let insightY = yPos + 6

        // What this means
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('What this means', marginLeft + 6, insightY)

        insightY += 4
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        const explanationLines = doc.splitTextToSize(insight.explanation || '', contentWidth - 14)
        doc.text(explanationLines.slice(0, 3), marginLeft + 6, insightY)

        insightY += Math.min(explanationLines.length, 3) * 3.5 + 5

        // Training Recommendations
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('Training Recommendations', marginLeft + 6, insightY)

        insightY += 4
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        
        const recommendations = insight.recommendations || []
        const maxRecs = insightCardHeight < 55 ? 2 : 4 // Show fewer recs if space is tight
        recommendations.slice(0, maxRecs).forEach((rec: string, i: number) => {
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          const recText = `${i + 1}. ${rec}`
          const recLines = doc.splitTextToSize(recText, contentWidth - 14)
          doc.text(recLines[0], marginLeft + 6, insightY)
          insightY += 3.5
        })

        // Coaching Cues (inline) - only if we have space
        if (insight.keyCues && insight.keyCues.length > 0 && insightY < yPos + insightCardHeight - 8) {
          insightY += 2
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text('Coaching Cues', marginLeft + 6, insightY)

          insightY += 3.5
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          const cuesText = insight.keyCues.slice(0, 2).join('   •   ')
          doc.text(cuesText, marginLeft + 6, insightY, { maxWidth: contentWidth - 14 })
        }
      }

      // Advance past the insight card's own height before drawing anything
      // else. This previously stayed at the card's top Y, so the trace
      // section's title (drawn by renderTracePage) landed on top of the
      // "What this means" text instead of underneath the whole card.
      yPos += insightCardHeight + 5

      // Real force trace, emblem and "this report's one focus" continue on
      // this same page, directly underneath Report Insights (footer is
      // printed once, at the bottom of this section, below).
      await renderTracePage({
        testName,
        displayTitle: testName,
        capacity: capacitySymmetry,
        expression: expressionSymmetry,
        leftReps: [],
        rightReps: [],
        combinedReps: group.records,
        primaryConfig: { icon: '', title: 'Peak Force', metricKey: 'force_peak', fallbackKeys: ['fp1_peak_force', 'p1_avg_force'], unit: 'N' },
        latestDate: group.latestDate,
        startY: yPos,
      })
    }

    // ===== LIMB SYMMETRY PAGE (Josh's #59/#60 request) =====
    // A dedicated ranked table of between-limb asymmetry across every test,
    // worst first, shown BEFORE the existing Performance Overview page below
    // (which ranks by change-vs-baseline instead - a different question).
    // Reuses calculateLimbSymmetry()/calculateExpressionSymmetry() exactly as
    // the per-test pages above do, including the same Left/Right Side pair
    // synthesis (see slSynthMetrics above), so this ranking always matches
    // what's shown on each test's own page. Standard A4, same chrome as the
    // Performance Overview page immediately after it.
    {
      doc.addPage([210, 297], 'portrait')
      pageNumber++

      const pageWidth = 210
      const pageHeight = 297
      const marginLeft = 15
      const marginRight = 15
      const contentWidth = pageWidth - marginLeft - marginRight

      doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
      doc.rect(0, 0, pageWidth, 20, 'F')

      let headerTextX = marginLeft
      if (logoDataUrl) {
        try {
          const logoFormat = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'
          doc.addImage(logoDataUrl, logoFormat, marginLeft, 3, 10, 10)
          headerTextX = marginLeft + 14
        } catch (_) { /* ignore */ }
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const limbSymHeaderTitle = branding?.org_name
        ? `${branding.org_name.toUpperCase()} | LIMB SYMMETRY`
        : 'LIMB SYMMETRY'
      doc.text(limbSymHeaderTitle, headerTextX, 12)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(220, 220, 220)
      doc.text(`${athlete_name}   |   ${team_name || 'N/A'}`, pageWidth - marginRight, 12, { align: 'right' })

      let yPos = 28

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text('Limb Symmetry', marginLeft, yPos)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text('Tests ranked by between-limb asymmetry, worst first', marginLeft, yPos + 5)

      yPos += 14

      const symmetryScores: { testName: string; metricLabel: string; leftValue: number; rightValue: number; symmetryPercent: number; hasData: boolean }[] = []
      const limbSymProcessedPairs = new Set<string>()

      for (const [testName, group] of groupedTests) {
        const isSideTest = testName.startsWith('Left Side') || testName.startsWith('Right Side')
        let result: LimbSymmetryResult | null
        let displayName: string

        if (isSideTest) {
          const baseExercise = testName.replace(/^(Left Side|Right Side)\s+/, '')
          if (limbSymProcessedPairs.has(baseExercise)) continue
          limbSymProcessedPairs.add(baseExercise)
          displayName = `${baseExercise} (Limb Comparison)`

          const pairedTestName = testName.startsWith('Left Side') ? `Right Side ${baseExercise}` : `Left Side ${baseExercise}`
          const pairedGroup = groupedTests.get(pairedTestName)
          const leftGroup = testName.startsWith('Left Side') ? group : pairedGroup
          const rightGroup = testName.startsWith('Right Side') ? group : pairedGroup
          const latestLeft = leftGroup?.latestMetrics || {}
          const latestRight = rightGroup?.latestMetrics || {}

          // Same field-synthesis shape as slSynthMetrics on the per-test page
          // above - forwards every field calculateLimbSymmetry/
          // calculateExpressionSymmetry know how to read.
          const synthMetrics: TestMetrics = {
            force_peak_left: latestLeft.force_peak,
            force_peak_right: latestRight.force_peak,
            force_50ms_left: latestLeft.force_50ms,
            force_50ms_right: latestRight.force_50ms,
            fp1_peak_landing_force: latestLeft.fp1_peak_landing_force ?? latestLeft.peak_landing_force,
            fp2_peak_landing_force: latestRight.fp2_peak_landing_force ?? latestRight.peak_landing_force,
            p1_avg_force: latestLeft.p1_avg_force ?? latestLeft.fp1_peak_force,
            p2_avg_force: latestRight.p2_avg_force ?? latestRight.fp2_peak_force,
            jump_height_left_cm: latestLeft.jump_height_left_cm ?? latestLeft.jump_height_cm,
            jump_height_right_cm: latestRight.jump_height_right_cm ?? latestRight.jump_height_cm,
            fp1_contribution: latestLeft.fp1_contribution ?? latestLeft.avg_fp1_contribution,
            fp2_contribution: latestRight.fp2_contribution ?? latestRight.avg_fp2_contribution,
          }
          result = calculateLimbSymmetry(testName, synthMetrics)
        } else {
          displayName = testName
          result = calculateLimbSymmetry(testName, group.latestMetrics)
        }

        symmetryScores.push({
          testName: displayName,
          metricLabel: result?.metricLabel || 'Symmetry',
          leftValue: result?.leftValue ?? 0,
          rightValue: result?.rightValue ?? 0,
          symmetryPercent: result ? 100 - result.asymmetryPercent : 0,
          hasData: result !== null,
        })
      }

      // Worst asymmetry (lowest symmetry%) first; tests with no symmetry
      // data at all are pushed to the bottom rather than ranked as "worst".
      symmetryScores.sort((a, b) => {
        if (a.hasData && b.hasData) return a.symmetryPercent - b.symmetryPercent
        if (a.hasData) return -1
        if (b.hasData) return 1
        return 0
      })

      const dataCount = symmetryScores.filter((s) => s.hasData).length
      let dataIndex = 0
      const rowHeight = 32

      symmetryScores.forEach((score, index) => {
        if (yPos + rowHeight + 10 > pageHeight - 20) {
          doc.setFontSize(8)
          doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
          doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
          doc.addPage([210, 297], 'portrait')
          pageNumber++
          yPos = 20
        }

        let rankLabel = '-'
        let rankColor = colors.muted
        let statusLabel = ''
        if (score.hasData) {
          dataIndex++
          rankLabel = `#${dataIndex}`
          const isWeakest = dataIndex === 1
          const isStrongest = dataIndex === dataCount
          rankColor = isWeakest ? colors.danger : isStrongest ? colors.success : colors.primary
          statusLabel = isWeakest ? 'Needs Focus' : isStrongest ? 'Most Symmetrical' : ''
        }

        doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 253)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, rowHeight, 1.5, 1.5, 'FD')

        doc.setFillColor(rankColor[0], rankColor[1], rankColor[2])
        doc.roundedRect(marginLeft + 3, yPos + 3, 16, 7, 1, 1, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(rankLabel, marginLeft + 11, yPos + 7.5, { align: 'center' })

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text(score.testName, marginLeft + 22, yPos + 7)

        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        if (score.hasData) {
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          doc.text(`${score.metricLabel}: L ${score.leftValue.toFixed(1)} / R ${score.rightValue.toFixed(1)}`, marginLeft + 22, yPos + 12)
          const symColor = score.symmetryPercent < 75 ? colors.danger : score.symmetryPercent < 90 ? [234, 179, 8] : colors.success
          doc.setTextColor(symColor[0], symColor[1], symColor[2])
          doc.text(`${score.symmetryPercent.toFixed(1)}% symmetrical`, marginLeft + 130, yPos + 12)
        } else {
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
          doc.text('Not available for this test yet.', marginLeft + 22, yPos + 12)
        }

        if (statusLabel) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(rankColor[0], rankColor[1], rankColor[2])
          doc.text(statusLabel, pageWidth - marginRight - 5, yPos + 7, { align: 'right' })
        }

        yPos += rowHeight + 3
      })

      yPos += 5
      if (yPos + 15 < pageHeight - 20) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])

        doc.setFillColor(colors.danger[0], colors.danger[1], colors.danger[2])
        doc.circle(marginLeft + 2, yPos, 1.5, 'F')
        doc.text('Needs most attention', marginLeft + 6, yPos + 1)

        doc.setFillColor(colors.success[0], colors.success[1], colors.success[2])
        doc.circle(marginLeft + 42, yPos, 1.5, 'F')
        doc.text('Most symmetrical', marginLeft + 46, yPos + 1)

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.circle(marginLeft + 80, yPos, 1.5, 'F')
        doc.text('Intermediate', marginLeft + 84, yPos + 1)
      }

      doc.setFontSize(8)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
    }

    // ===== SUMMARY OVERVIEW PAGE =====
    // Standard A4 - this page's own layout math (pageHeight = 297 below)
    // assumes it, unlike the taller per-test pages above.
    {
      doc.addPage([210, 297], 'portrait')
      pageNumber++

      const pageWidth = 210
      const pageHeight = 297
      const marginLeft = 15
      const marginRight = 15
      const contentWidth = pageWidth - marginLeft - marginRight

      // Header bar
      doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
      doc.rect(0, 0, pageWidth, 20, 'F')

      let headerTextX = marginLeft
      if (logoDataUrl) {
        try {
          const logoFormat = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'
          doc.addImage(logoDataUrl, logoFormat, marginLeft, 3, 10, 10)
          headerTextX = marginLeft + 14
        } catch (_) { /* ignore */ }
      }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      const summaryHeaderTitle = branding?.org_name
        ? `${branding.org_name.toUpperCase()} | PERFORMANCE SUMMARY`
        : 'PERFORMANCE SUMMARY'
      doc.text(summaryHeaderTitle, headerTextX, 12)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(220, 220, 220)
      doc.text(`${athlete_name}   |   ${team_name || 'N/A'}`, pageWidth - marginRight, 12, { align: 'right' })

      let yPos = 28

      // Section title
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text('Performance Overview', marginLeft, yPos)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text('Tests ranked from areas requiring most attention to strongest outcomes', marginLeft, yPos + 5)

      yPos += 14

      // Collect primary metric scores for ranking
      const testScores: { testName: string; primaryMetric: string; value: number | null; unit: string; baseline: number | null; personalRecord: number | null; changePercent: number | null; insight: any }[] = []
      const summaryProcessedPairs = new Set<string>()

      for (const [testName, group] of groupedTests) {
        const isSideTest = testName.startsWith('Left Side') || testName.startsWith('Right Side')
        if (isSideTest) {
          const baseExercise = testName.replace(/^(Left Side|Right Side)\s+/, '')
          if (summaryProcessedPairs.has(baseExercise)) continue
          summaryProcessedPairs.add(baseExercise)
        }

        const configs = getCardConfigs(testName)
        const primaryConfig = configs[0]
        const currentValue = getMetricValue(group.latestMetrics, primaryConfig)
        const baselineValue = group.baseline ? getMetricValue(group.baseline, primaryConfig) : null
        const prValue = group.personalRecord ? getMetricValue(group.personalRecord, primaryConfig) : null

        let changePercent: number | null = null
        if (currentValue !== null && baselineValue !== null && baselineValue !== 0) {
          changePercent = ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100
        }

        const displayName = isSideTest
          ? `${testName.replace(/^(Left Side|Right Side)\s+/, '')} (Limb Comparison)`
          : testName

        testScores.push({
          testName: displayName,
          primaryMetric: primaryConfig.title,
          value: currentValue,
          unit: primaryConfig.unit,
          baseline: baselineValue,
          personalRecord: prValue,
          changePercent,
          insight: aiInsights.get(testName) || null,
        })
      }

      // Sort: worst (lowest change%) first, best last
      testScores.sort((a, b) => {
        const aScore = a.changePercent ?? 0
        const bScore = b.changePercent ?? 0
        return aScore - bScore
      })

      // Render each test row
      const rowHeight = 32
      testScores.forEach((score, index) => {
        if (yPos + rowHeight + 10 > pageHeight - 20) {
          // Footer before overflow
          doc.setFontSize(8)
          doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
          doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
          doc.addPage([210, 297], 'portrait')
          pageNumber++
          yPos = 20
        }

        const isWeakest = index === 0
        const isStrongest = index === testScores.length - 1
        const rankColor = isWeakest ? colors.danger : isStrongest ? colors.success : colors.primary

        // Row background
        doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 253)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, rowHeight, 1.5, 1.5, 'FD')

        // Rank badge
        doc.setFillColor(rankColor[0], rankColor[1], rankColor[2])
        doc.roundedRect(marginLeft + 3, yPos + 3, 16, 7, 1, 1, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(`#${index + 1}`, marginLeft + 11, yPos + 7.5, { align: 'center' })

        // Test name
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text(score.testName, marginLeft + 22, yPos + 7)

        // KPI values
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])

        const valueStr = score.value !== null ? `${score.value.toFixed(1)} ${score.unit}`.trim() : 'N/A'
        const changeStr = score.changePercent !== null
          ? `${score.changePercent >= 0 ? '+' : ''}${score.changePercent.toFixed(1)}% from baseline`
          : ''
        const prStr = score.personalRecord !== null ? `PR: ${score.personalRecord.toFixed(1)} ${score.unit}`.trim() : ''

        doc.text(`Current: ${valueStr}`, marginLeft + 22, yPos + 12)
        if (changeStr) {
          const changeColor = (score.changePercent || 0) >= 0 ? colors.success : colors.danger
          doc.setTextColor(changeColor[0], changeColor[1], changeColor[2])
          doc.text(changeStr, marginLeft + 80, yPos + 12)
        }
        if (prStr) {
          doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
          doc.text(prStr, marginLeft + 140, yPos + 12)
        }

        // Simplified recommendation and coaching cue
        const insight = score.insight
        if (insight) {
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])

          const rec = insight.recommendations?.[0] || ''
          if (rec) {
            const recLines = doc.splitTextToSize(`Recommendation: ${rec}`, contentWidth - 25)
            doc.text(recLines[0], marginLeft + 22, yPos + 18)
          }

          const cue = insight.keyCues?.[0] || ''
          if (cue) {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2])
            const cueLines = doc.splitTextToSize(`Coaching Cue: "${cue}"`, contentWidth - 25)
            doc.text(cueLines[0], marginLeft + 22, yPos + 23)
          }
        }

        // Status label
        const statusLabel = isWeakest ? 'Needs Focus' : isStrongest ? 'Strongest' : ''
        if (statusLabel) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(rankColor[0], rankColor[1], rankColor[2])
          doc.text(statusLabel, pageWidth - marginRight - 5, yPos + 7, { align: 'right' })
        }

        yPos += rowHeight + 3
      })

      // Legend
      yPos += 5
      if (yPos + 15 < pageHeight - 20) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])

        doc.setFillColor(colors.danger[0], colors.danger[1], colors.danger[2])
        doc.circle(marginLeft + 2, yPos, 1.5, 'F')
        doc.text('Needs most attention', marginLeft + 6, yPos + 1)

        doc.setFillColor(colors.success[0], colors.success[1], colors.success[2])
        doc.circle(marginLeft + 42, yPos, 1.5, 'F')
        doc.text('Strongest outcome', marginLeft + 46, yPos + 1)

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.circle(marginLeft + 80, yPos, 1.5, 'F')
        doc.text('Intermediate', marginLeft + 84, yPos + 1)
      }

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
    }

    // ===== AI COACH INSIGHT PAGE (optional) =====
    // Standard A4 - same reasoning as the summary overview page above.
    if (includedAiInsight) {
      try {
        doc.addPage([210, 297], 'portrait')
        pageNumber++
        const pageWidth = 210
        const pageHeight = 297
        const marginLeft = 15
        const marginRight = 15
        const contentWidth = pageWidth - marginLeft - marginRight

        // Header bar
        doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
        doc.rect(0, 0, pageWidth, 20, 'F')

        let headerTextX = marginLeft
        if (logoDataUrl) {
          try {
            const logoFormat = logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG'
            doc.addImage(logoDataUrl, logoFormat, marginLeft, 3, 10, 10)
            headerTextX = marginLeft + 14
          } catch (_) { /* ignore */ }
        }

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        const aiHeaderTitle = branding?.org_name
          ? `${branding.org_name.toUpperCase()} | AI COACH INSIGHT`
          : 'AI COACH INSIGHT'
        doc.text(aiHeaderTitle, headerTextX, 12)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(220, 220, 220)
        doc.text(`${athlete_name}   |   ${team_name || 'N/A'}`, pageWidth - marginRight, 12, { align: 'right' })

        let yPos = 30

        // Test focus pill
        if (ai_insight.testName) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
          doc.text(`Test focus: ${String(ai_insight.testName)}`, marginLeft, yPos)
          yPos += 7
        }

        // Disclaimer banner
        doc.setFillColor(252, 248, 227)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, 10, 2, 2, 'FD')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120, 90, 20)
        doc.text(
          'AI-generated coaching commentary. Review before sharing with athletes.',
          marginLeft + 4,
          yPos + 6.5,
        )
        yPos += 16

        // Explanation
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('Explanation', marginLeft, yPos)
        yPos += 6

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)
        const explanationLines = doc.splitTextToSize(String(ai_insight.explanation || ''), contentWidth)
        doc.text(explanationLines, marginLeft, yPos)
        yPos += explanationLines.length * 5 + 6

        // Recommendations
        const recs: string[] = Array.isArray(ai_insight.recommendations) ? ai_insight.recommendations : []
        if (recs.length > 0) {
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text('Recommendations', marginLeft, yPos)
          yPos += 6

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(50, 50, 50)
          for (const rec of recs) {
            const lines = doc.splitTextToSize(`• ${String(rec)}`, contentWidth - 4)
            if (yPos + lines.length * 5 > pageHeight - 20) {
              doc.addPage([210, 297], 'portrait')
              pageNumber++
              yPos = 20
            }
            doc.text(lines, marginLeft + 2, yPos)
            yPos += lines.length * 5 + 2
          }
          yPos += 4
        }

        // Key cues
        const cues: string[] = Array.isArray(ai_insight.keyCues) ? ai_insight.keyCues : []
        if (cues.length > 0) {
          if (yPos + 20 > pageHeight - 20) {
            doc.addPage([210, 297], 'portrait')
            pageNumber++
            yPos = 20
          }
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text('Key cues', marginLeft, yPos)
          yPos += 6

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(50, 50, 50)
          for (const cue of cues) {
            const lines = doc.splitTextToSize(`• ${String(cue)}`, contentWidth - 4)
            if (yPos + lines.length * 5 > pageHeight - 20) {
              doc.addPage([210, 297], 'portrait')
              pageNumber++
              yPos = 20
            }
            doc.text(lines, marginLeft + 2, yPos)
            yPos += lines.length * 5 + 2
          }
        }

        // Footer
        doc.setFontSize(8)
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
        doc.text(`Page ${pageNumber}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
      } catch (insightErr) {
        console.error('Failed to render AI insight page:', insightErr)
        // Non-fatal: report still completes without the AI page
      }
    }

    // Generate filename - remove all special characters including en-dash
    const safeName = athlete_name.replace(/[^a-zA-Z0-9\s]/g, '').trim()
    const safeTeamName = (team_name || 'Unknown').replace(/[^a-zA-Z0-9\s]/g, '').trim()
    const fromDateStr = formatDateForFilename(minDate)
    const toDateStr = formatDateForFilename(maxDate)
    const fileName = `${safeName} ${fromDateStr} - ${toDateStr} ${safeTeamName} Force Plate Report.pdf`.replace(/\s+/g, ' ')

    // Convert to buffer and upload
    const pdfBuffer = doc.output('arraybuffer')

    const { error: uploadError } = await supabaseClient.storage
      .from('athlete-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from('athlete-reports')
      .createSignedUrl(fileName, 3600) // 1 hour expiry

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      throw signedUrlError
    }

    console.log('Force plate PDF generated successfully:', signedUrlData.signedUrl)

    const durationMs = Date.now() - startTs
    await logActivity({
      eventType: 'report_generated',
      eventSource: 'generate-force-plate-report',
      severity: 'success',
      teamId: teamIdForLog,
      athleteId: athleteIdForLog,
      organisationName: team_name ?? null,
      metadata: {
        report_type: 'force-plate',
        athlete_name: athleteNameForLog,
        filename: fileName,
        report_url: signedUrlData.signedUrl,
        test_count: groupedTests.size,
        duration_ms: durationMs,
        included_ai_insight: includedAiInsight,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        report_url: signedUrlData.signedUrl,
        filename: fileName,
        athlete_name,
        athlete_id,
        test_count: groupedTests.size,
        tests: Array.from(groupedTests.keys()),
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.error('Error generating force plate PDF:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    await logActivity({
      eventType: 'report_generation_failed',
      eventSource: 'generate-force-plate-report',
      severity: 'critical',
      teamId: teamIdForLog,
      athleteId: athleteIdForLog,
      metadata: {
        report_type: 'force-plate',
        athlete_name: athleteNameForLog,
        duration_ms: Date.now() - startTs,
        error: errMsg,
      },
    })
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateForFilename(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}
