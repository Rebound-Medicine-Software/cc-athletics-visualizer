/**
 * Test-specific analysis dashboards rendered inline above the sessions table.
 * Routes by test_type (Jumps, Isometrics, Balance, Movement → Golf Swing, else Generic).
 *
 * - Works for BOTH `source = 'api'` and `source = 'manual_csv'`.
 * - When raw time-series channels (e.g. force plate quadrants) are present in
 *   `metrics`, a true force/time trace is rendered.
 * - When only summary metrics are present (typical API rows), the curve is
 *   replaced by a clear note: "No force/time curve available for this result"
 *   and the summary metrics are shown instead.
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { format } from 'date-fns';
import { Activity, TrendingUp, Scale, Move, Target, Loader2, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GolfSwingAnalysis } from './GolfSwingAnalysis';
import {
  analyseSummary, analyseTrace, inferTestKind,
  type PhaseAnalysis, type TraceSample, type TestKind, type SSCCategory,
} from '@/lib/movement/phaseEngine';
import { fetchRawTrace, pickRawCsvPath } from '@/lib/movement/rawTraceFetch';

export interface AnalysisRow {
  id: string;
  athlete_id: string | null;
  athlete_name: string;
  test_date: string;
  test_type: string;
  test_subtype: string | null;
  test_name: string;
  metrics: Record<string, any>;
  source: string;
  repetition_number: number;
  import_batch_id: string | null;
  file_hash: string | null;
  original_file_name: string | null;
}

const num = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

const flat = (m: Record<string, any> | null | undefined): Record<string, any> => {
  if (!m) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(m)) if (k !== '_raw') out[k] = v;
  const raw = m._raw;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const nk = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (nk && out[nk] === undefined) out[nk] = v;
    }
  }
  return out;
};

const lbl = (k: string) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const GOLF_CHANNELS = ['fp1_bl', 'fp1_br', 'fp1_fr', 'fp1_fl', 'fp2_bl', 'fp2_br', 'fp2_fr', 'fp2_fl'];

export const isGolfRow = (r: { test_type?: string | null; test_subtype?: string | null; test_name?: string | null; metrics?: any }) => {
  const tt = (r.test_type ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const st = (r.test_subtype ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const tn = (r.test_name ?? '').toLowerCase();
  const f = flat(r.metrics ?? {});
  const channels = GOLF_CHANNELS.some((k) => k in f);
  if (tt === 'movement') return st === 'golf_swing' || st === 'golfswing' || tn.includes('golf') || channels;
  return channels && (st === 'golf_swing' || tn.includes('golf'));
};

/** Heuristic: does any row in this group carry a sample-level raw trace? */
const groupHasTrace = (rows: AnalysisRow[]) => {
  if (rows.length < 5) return false;
  // multiple rows with monotonic repetition_number = looks like a trace
  const reps = new Set(rows.map((r) => r.repetition_number));
  if (reps.size < 5) return false;
  const f = flat(rows[0]?.metrics ?? {});
  return GOLF_CHANNELS.some((k) => k in f) || 'force' in f || 'force_n' in f;
};

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------

export interface TestAnalysisRouterProps {
  /** Currently visible rows (post-filter), oldest→newest order not required. */
  rows: AnalysisRow[];
  /** Optional explicit test type override (e.g. when user picks one). */
  selectedTestType?: string | null;
  /** Optional explicit subtype filter. */
  selectedSubtype?: string | null;
  /** Open the full Golf Swing analysis drawer for a row. */
  onOpenGolfRow?: (row: AnalysisRow) => void;
}

export const TestAnalysisRouter = ({
  rows, selectedTestType, selectedSubtype, onOpenGolfRow,
}: TestAnalysisRouterProps) => {
  // Pick a primary type to specialise on. If user picked one, use it.
  // Otherwise infer from the dominant test_type in the visible rows.
  // Single-Leg DJ rows are mis-typed as 'isometric' by the CC API — when the user
  // explicitly selected Jumps (or any Jump subtype), force the jump pipeline.
  const primaryType = useMemo(() => {
    if (selectedTestType) {
      const t = selectedTestType.toLowerCase();
      if (t === 'jumps' || t === 'jump') return 'jump';
      if (t === 'isometrics') return 'isometric';
      if (t === 'movement') return 'movement';
      if (t === 'balance') return 'balance';
      return t;
    }
    const counts = new Map<string, number>();
    for (const r of rows) {
      const t = (r.test_type ?? '').toLowerCase();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let best: string | null = null;
    let max = 0;
    for (const [k, v] of counts) if (v > max) { max = v; best = k; }
    return best ?? null;
  }, [rows, selectedTestType]);

  const isGolfScope = useMemo(
    () => primaryType === 'movement' && (
      (selectedSubtype ?? '').toLowerCase() === 'golf_swing' ||
      rows.some((r) => isGolfRow(r))
    ),
    [primaryType, selectedSubtype, rows],
  );

  if (rows.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No test rows match the current filters — adjust filters above to populate the analysis hub.
      </Card>
    );
  }

  if (isGolfScope) {
    return <GolfScopeDashboard rows={rows.filter(isGolfRow)} onOpenGolfRow={onOpenGolfRow} />;
  }

  switch (primaryType) {
    case 'jump':
    case 'pogo':
      return <JumpAnalysisInline rows={rows} />;
    case 'isometric':
    case 'imtp':
      return <IsometricAnalysisInline rows={rows} />;
    case 'balance':
      return <BalanceAnalysisInline rows={rows} />;
    default:
      return <GenericTimeline rows={rows} />;
  }
};


// ----------------------------------------------------------------------------
// Shared building blocks
// ----------------------------------------------------------------------------

const DashboardHeader = ({
  icon: Icon, title, subtitle, badges = [],
}: {
  icon: any; title: string; subtitle: string;
  badges?: { label: string; tone?: 'default' | 'secondary' | 'outline' }[];
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <Badge key={i} variant={b.tone ?? 'secondary'}>{b.label}</Badge>
      ))}
    </div>
  </div>
);

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-md border bg-card/40 p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold tabular-nums">{value}</div>
    {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
  </div>
);

const NoCurveNote = ({ message }: { message: string }) => (
  <div className="h-[200px] flex flex-col items-center justify-center text-center px-4 border border-dashed rounded-md text-sm text-muted-foreground">
    <Activity className="w-5 h-5 mb-2 opacity-60" />
    <div>{message}</div>
  </div>
);

// ----------------------------------------------------------------------------
// Phase Panel (movement phase engine, Pedley et al. 2023)
// ----------------------------------------------------------------------------

const SSC_TONE: Record<string, string> = {
  good: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  moderate: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  poor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

// Test kinds where Pedley spring-like correlation is meaningful
const SPRING_LIKE_KINDS = new Set([
  'cmj', 'cmj_sl', 'dj', 'dj_sl', 'pogo', 'pogo_sl',
]);
const SPRING_LIKE_NA_KINDS = new Set([
  'imtp', 'isometric', 'isometric_squat', 'isometric_calf',
  'balance', 'balance_sl', 'golf_swing', 'sit_to_stand',
]);

type SpringLikeStatus = 'spring' | 'not_spring' | 'locked' | 'unavailable' | 'na';

const STATUS_STYLES: Record<SpringLikeStatus, { wrap: string; chip: string; label: string }> = {
  spring:      { wrap: 'border-emerald-500/40 bg-emerald-500/5', chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', label: 'Spring-like behaviour present' },
  not_spring:  { wrap: 'border-rose-500/40 bg-rose-500/5',       chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',          label: 'Not spring-like' },
  locked:      { wrap: 'border-amber-500/40 bg-amber-500/5',     chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',     label: 'Locked — raw trace required' },
  unavailable: { wrap: 'border-amber-500/40 bg-amber-500/5',     chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',     label: 'Unavailable' },
  na:          { wrap: 'border-border bg-muted/30',              chip: 'bg-muted text-muted-foreground border-border',                                label: 'Not applicable for this test' },
};

const SSC_STYLES: Record<SSCCategory | 'unknown', string> = {
  good:     'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  moderate: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  poor:     'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  unknown:  'bg-muted text-muted-foreground border-border',
};

/** Card: Pedley spring-like correlation, always visible for applicable tests. */
const SpringLikeCard = ({
  kind, analysis, hasTraceLoaded, rawCsvPath,
  onLoadRawTrace, loadState, loadError,
  scatter,
}: {
  kind: TestKind;
  analysis: PhaseAnalysis | null;
  hasTraceLoaded: boolean;
  rawCsvPath: string | null;
  onLoadRawTrace: () => void;
  loadState: 'idle' | 'loading' | 'error' | 'success';
  loadError: string | null;
  scatter: { disp: number; force: number }[];
}) => {
  const applicable = SPRING_LIKE_KINDS.has(kind);
  const notApplicable = SPRING_LIKE_NA_KINDS.has(kind) || !applicable;

  let status: SpringLikeStatus;
  if (notApplicable) status = 'na';
  else if (!analysis?.hasTrace && !rawCsvPath) status = 'unavailable';
  else if (!analysis?.hasTrace) status = 'locked';
  else if (analysis.springLike.r === null) status = 'unavailable';
  else status = analysis.springLike.isSpringLike ? 'spring' : 'not_spring';

  const s = STATUS_STYLES[status];
  const r = analysis?.springLike.r;
  const rText = r === null || r === undefined ? '—' : r.toFixed(2);
  const ssc = analysis?.sscCategory ?? 'unknown';
  const impactText = !analysis?.hasTrace
    ? 'Awaiting raw trace'
    : analysis.derived.impactPeakF !== undefined
      ? `Impact peak present (${Math.round(analysis.derived.impactPeakF)} N)`
      : 'No impact peak detected';

  return (
    <Card className={`p-4 space-y-3 border ${s.wrap}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            Spring-Like Correlation
            <Badge variant="outline" className={s.chip}>{s.label}</Badge>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pedley et al. (2023) · Pearson r between CoM displacement and vertical force during ground contact.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Analysis mode</div>
          <Badge variant="secondary" className="text-[10px]">
            {hasTraceLoaded ? 'Trace-loaded' : 'Summary-only'}
          </Badge>
        </div>
      </div>

      {status === 'na' ? (
        <div className="text-xs text-muted-foreground">
          Spring-like correlation is not applicable to this test type. It is reported for DJ,
          Single-leg DJ, Pogo, Single-leg Pogo, CMJ and Single-leg CMJ only.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Pearson r" value={rText} hint="lower (more negative) = more spring-like" />
            <Stat label="Threshold" value="r ≤ −0.80" hint="Pedley et al. 2023" />
            <div className="rounded-md border bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">SSC Category</div>
              <div className="mt-1">
                <Badge variant="outline" className={SSC_STYLES[ssc]}>
                  {ssc === 'unknown' ? 'Unknown' : ssc.charAt(0).toUpperCase() + ssc.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="rounded-md border bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Impact peak</div>
              <div className="text-xs font-medium mt-1">{impactText}</div>
            </div>
          </div>

          {status === 'locked' && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold">Raw force-time trace required</div>
                <p className="text-muted-foreground mt-0.5">
                  Load the CC Athletics raw CSV for this rep to unlock Pearson r,
                  spring-like classification and SSC category.
                </p>
              </div>
              <Button size="sm" onClick={onLoadRawTrace} disabled={loadState === 'loading'}>
                {loadState === 'loading'
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Loading…</>
                  : <><Download className="h-3.5 w-3.5 mr-1.5" />Load raw force trace</>}
              </Button>
            </div>
          )}

          {status === 'unavailable' && !rawCsvPath && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-300">Raw CSV path unavailable from API payload</div>
              <p className="text-muted-foreground">
                This result only contains summary metrics — no <code>raw_csv_path</code> was returned
                by the CC Athletics API, so the Pearson r cannot be computed.
              </p>
              <Button size="sm" variant="outline" disabled className="mt-1">
                <Download className="h-3.5 w-3.5 mr-1.5" />Load raw force trace
              </Button>
            </div>
          )}

          {loadState === 'error' && loadError && (
            <div className="text-xs text-rose-600 dark:text-rose-400">
              Failed to load raw trace: {loadError}
            </div>
          )}

          <Card className="p-3">
            <h5 className="text-xs font-semibold text-muted-foreground mb-2">Force vs CoM Displacement</h5>
            {scatter.length > 4 ? (
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="disp" name="CoM disp"
                    tick={{ fontSize: 10 }} label={{ value: 'CoM displacement (m)', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis type="number" dataKey="force" name="Force"
                    tick={{ fontSize: 10 }} label={{ value: 'Force (N)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <ZAxis range={[20, 20]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={scatter} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-center text-xs text-muted-foreground border border-dashed rounded-md px-4">
                Force-displacement relationship will appear after raw trace is loaded.
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              A clean inverse (negatively-sloped) cluster indicates spring-like behaviour.
            </p>
          </Card>
        </>
      )}
    </Card>
  );
};

const PhasePanel = ({ rows }: { rows: AnalysisRow[] }) => {
  // Distinct trials available: one entry per (athlete, date, test_name, rep).
  const trials = useMemo(() => {
    const seen = new Map<string, AnalysisRow>();
    for (const r of rows) {
      const k = `${r.athlete_id}|${r.test_date}|${r.test_name}|${r.repetition_number}`;
      if (!seen.has(k)) seen.set(k, r);
    }
    return Array.from(seen.values()).sort((a, b) => b.test_date.localeCompare(a.test_date));
  }, [rows]);

  const [trialKey, setTrialKey] = useState<string | null>(null);
  const head = useMemo(() => {
    if (trialKey) {
      const found = trials.find((t) => `${t.id}` === trialKey);
      if (found) return found;
    }
    return trials[0] ?? rows[0];
  }, [trialKey, trials, rows]);

  const kind = useMemo(
    () => (head ? inferTestKind(head.test_type, head.test_subtype, head.test_name) : 'unknown'),
    [head],
  );
  const rawCsvPath = useMemo(() => (head ? pickRawCsvPath(head.metrics) : null), [head]);
  const bodyMassKg = head ? Number((head.metrics as any)?.body_mass) || undefined : undefined;
  const samplingFrequency = head
    ? Number((head.metrics as any)?.sampling_frequency) || undefined
    : undefined;

  const [loadedSamplesByTrial, setLoadedSamplesByTrial] = useState<Record<string, TraceSample[]>>({});
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedSamples = head ? loadedSamplesByTrial[head.id] ?? null : null;


  // Assemble samples from CSV-style rows (existing behaviour) — used when no raw API trace loaded
  const assembledSamples = useMemo<TraceSample[] | null>(() => {
    if (!head) return null;
    const sameGroup = rows.filter(
      (r) =>
        r.athlete_id === head.athlete_id &&
        r.test_date === head.test_date &&
        (r.import_batch_id ?? r.file_hash) === (head.import_batch_id ?? head.file_hash),
    );
    const sampleRate = 1000;
    const samples: TraceSample[] = [];
    for (const r of sameGroup) {
      const f = (r.metrics as any) ?? {};
      const force = Number(f.force ?? f.force_n ?? f.fz ?? NaN);
      if (!Number.isFinite(force)) continue;
      const t = Number.isFinite(Number(f.time ?? f.t))
        ? Number(f.time ?? f.t)
        : r.repetition_number / sampleRate;
      const com = Number.isFinite(Number(f.com ?? f.com_disp)) ? Number(f.com ?? f.com_disp) : undefined;
      samples.push({ t, f: force, com });
    }
    if (samples.length > 32) {
      samples.sort((a, b) => a.t - b.t);
      return samples;
    }
    return null;
  }, [rows, head]);

  const activeSamples = loadedSamples ?? assembledSamples;
  const hasTraceLoaded = !!loadedSamples;

  const analysis = useMemo<PhaseAnalysis | null>(() => {
    if (!head) return null;
    if (activeSamples && activeSamples.length > 32) {
      return analyseTrace(activeSamples, { test: kind, bodyMassKg });
    }
    return analyseSummary(kind, head.metrics ?? {});
  }, [activeSamples, head, kind, bodyMassKg]);

  // Build Force vs CoM Displacement scatter from the active trace
  const scatter = useMemo<{ disp: number; force: number }[]>(() => {
    if (!analysis?.hasTrace || !activeSamples || !activeSamples.length) return [];
    const c = analysis.contacts[0];
    if (!c) return [];
    const inContact = activeSamples.filter((s) => s.t >= c.startT && s.t <= c.endT);
    const hasCom = inContact.some((s) => s.com !== undefined);
    if (hasCom) {
      return inContact
        .filter((s) => s.com !== undefined)
        .map((s) => ({ disp: s.com as number, force: Math.abs(s.f) }));
    }
    // No CoM channel — fall back to integrated displacement only if we have body mass
    if (!bodyMassKg) return [];
    const g = 9.81;
    let v = 0, d = 0;
    const out: { disp: number; force: number }[] = [];
    for (let i = 1; i < inContact.length; i++) {
      const dt = inContact[i].t - inContact[i - 1].t;
      const a = (inContact[i].f - bodyMassKg * g) / bodyMassKg;
      v += a * dt;
      d += v * dt;
      out.push({ disp: d, force: Math.abs(inContact[i].f) });
    }
    // Subsample for chart readability
    const step = Math.max(1, Math.floor(out.length / 200));
    return out.filter((_, i) => i % step === 0);
  }, [analysis, activeSamples, bodyMassKg]);

  if (!analysis) return null;

  const handleLoadRawTrace = async () => {
    if (!rawCsvPath || !head) return;
    setLoadState('loading');
    setLoadError(null);
    try {
      const res = await fetchRawTrace(rawCsvPath, { bodyMassKg, samplingFrequency });
      if (!res.samples.length) throw new Error('No samples parsed from raw CSV');
      setLoadedSamplesByTrial((prev) => ({ ...prev, [head.id]: res.samples }));
      setLoadState('success');
    } catch (e) {
      setLoadError((e as Error).message);
      setLoadState('error');
    }
  };


  return (
    <Card className="p-4 space-y-4 border-primary/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Movement phase analysis</h4>
          <p className="text-xs text-muted-foreground">
            Phase detection {analysis.hasTrace ? 'from force-time trace' : 'from summary metrics (no curve in source)'} · Pedley et al. (2023) spring-like correlation
          </p>
        </div>
        {trials.length > 1 && (
          <div className="min-w-[280px]">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Trial</label>
            <select
              className="w-full text-xs rounded-md border bg-background px-2 py-1.5"
              value={head?.id ?? ''}
              onChange={(e) => setTrialKey(e.target.value)}
            >
              {trials.map((t) => {
                const hasRaw = !!pickRawCsvPath(t.metrics);
                const hasLoaded = !!loadedSamplesByTrial[t.id];
                return (
                  <option key={t.id} value={t.id}>
                    {t.test_date} · {t.test_name} · Rep {t.repetition_number} · {t.source === 'api' ? 'API' : 'CSV'}
                    {hasLoaded ? ' · trace loaded' : hasRaw ? ' · raw available' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Force–time curve (visible whenever a trace is available or has been loaded) */}
      {activeSamples && activeSamples.length > 32 && (
        <Card className="p-3">
          <h5 className="text-xs font-semibold text-muted-foreground mb-2">Force / time trace</h5>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={activeSamples
              .filter((_, i) => i % Math.max(1, Math.floor(activeSamples.length / 600)) === 0)
              .map((s) => ({ t: s.t, f: s.f }))}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(2)}s`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [`${Number(v).toFixed(0)} N`, 'Force']} labelFormatter={(v) => `t=${Number(v).toFixed(3)}s`} />
              {analysis.contacts.map((c, i) => (
                <ReferenceLine key={`s${i}`} x={c.startT} stroke="hsl(var(--primary))" strokeDasharray="2 2" />
              ))}
              {analysis.contacts.map((c, i) => (
                <ReferenceLine key={`e${i}`} x={c.endT} stroke="hsl(var(--primary))" strokeDasharray="2 2" />
              ))}
              <Line type="monotone" dataKey="f" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}


      {/* Prominent first-class Spring-Like Correlation card */}
      <SpringLikeCard
        kind={kind}
        analysis={analysis}
        hasTraceLoaded={hasTraceLoaded}
        rawCsvPath={rawCsvPath}
        onLoadRawTrace={handleLoadRawTrace}
        loadState={loadState}
        loadError={loadError}
        scatter={scatter}
      />

      {/* Modelled vs actual force, placed directly under the spring-like card */}
      {analysis.modelled && (
        <Card className="p-3">
          <h5 className="text-xs font-semibold text-muted-foreground mb-2">Modelled (half-sine) vs actual force</h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analysis.modelled.actual.map((a, i) => ({
              t: a.tNorm, actual: a.f, model: analysis.modelled!.model[i].f,
            }))}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="model" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {analysis.modelled.quintileDelta.map((q) => {
              const tone = q.pct > 15 ? 'text-rose-600 dark:text-rose-300'
                : q.pct < -10 ? 'text-amber-600 dark:text-amber-300'
                : 'text-emerald-600 dark:text-emerald-300';
              return (
                <div key={q.quintile} className="rounded border p-1.5 text-center">
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Q{q.quintile}</div>
                  <div className={`text-xs font-semibold tabular-nums ${tone}`}>
                    {q.pct >= 0 ? '+' : ''}{q.pct.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
          <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
            {analysis.modelled.insights.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </Card>
      )}

      {analysis.bands.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Detected phases</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.bands.map((b, i) => (
              <Badge key={i} variant="secondary">
                {b.label} · {((b.endT - b.startT) * 1000).toFixed(0)} ms
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {analysis.derived.contactTimeMs !== undefined && (
          <Stat label="Contact time" value={`${fmt(analysis.derived.contactTimeMs, 0)} ms`} />
        )}
        {analysis.derived.flightTimeMs !== undefined && (
          <Stat label="Flight time" value={`${fmt(analysis.derived.flightTimeMs, 0)} ms`} />
        )}
        {analysis.derived.brakingImpulseNs !== undefined && (
          <Stat label="Braking impulse" value={`${fmt(analysis.derived.brakingImpulseNs, 1)} N·s`} />
        )}
        {analysis.derived.propulsiveImpulseNs !== undefined && (
          <Stat label="Propulsive impulse" value={`${fmt(analysis.derived.propulsiveImpulseNs, 1)} N·s`} />
        )}
        {analysis.derived.rsiModified !== undefined && (
          <Stat label="RSI modified" value={fmt(analysis.derived.rsiModified, 2)} />
        )}
        {analysis.derived.impactPeakF !== undefined && (
          <Stat label="Impact peak" value={`${fmt(analysis.derived.impactPeakF, 0)} N`} hint="early braking peak" />
        )}
      </div>

      {analysis.prescriptions.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs font-semibold mb-1.5">Suggested training focus</div>
          <ul className="text-xs space-y-1">
            {analysis.prescriptions.map((p, i) => (
              <li key={i}><span className="font-medium">{p.issue}:</span> <span className="text-muted-foreground">{p.focus}</span></li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};


const fmt = (v: number | null, digits = 1) =>
  v === null || !Number.isFinite(v) ? '—' : v.toFixed(digits);

const sourceBadgesFor = (rows: AnalysisRow[]) => {
  const api = rows.filter((r) => r.source === 'api').length;
  const csv = rows.filter((r) => r.source === 'manual_csv').length;
  const out: { label: string; tone?: 'default' | 'secondary' | 'outline' }[] = [];
  if (api) out.push({ label: `API · ${api}`, tone: 'outline' });
  if (csv) out.push({ label: `Manual CSV · ${csv}`, tone: 'secondary' });
  return out;
};

const trendByDate = (rows: AnalysisRow[], key: string) => {
  const byDate = new Map<string, { date: string; sum: number; n: number; api?: number; csv?: number }>();
  for (const r of rows) {
    const v = num(flat(r.metrics)[key]);
    if (v === null) continue;
    const e = byDate.get(r.test_date) ?? { date: r.test_date, sum: 0, n: 0 };
    e.sum += v; e.n += 1;
    if (r.source === 'api') e.api = (e.api ?? 0) + v;
    if (r.source === 'manual_csv') e.csv = (e.csv ?? 0) + v;
    byDate.set(r.test_date, e);
  }
  return Array.from(byDate.values())
    .map((e) => ({ date: e.date, value: e.sum / e.n }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const meanOf = (rows: AnalysisRow[], key: string): number | null => {
  let s = 0, n = 0;
  for (const r of rows) { const v = num(flat(r.metrics)[key]); if (v !== null) { s += v; n++; } }
  return n ? s / n : null;
};

const maxOf = (rows: AnalysisRow[], key: string): number | null => {
  let m: number | null = null;
  for (const r of rows) { const v = num(flat(r.metrics)[key]); if (v !== null) m = m === null ? v : Math.max(m, v); }
  return m;
};

// ----------------------------------------------------------------------------
// Jump
// ----------------------------------------------------------------------------

const JumpAnalysisInline = ({ rows }: { rows: AnalysisRow[] }) => {
  const hasTrace = groupHasTrace(rows);
  const peak = maxOf(rows, 'peak_force') ?? maxOf(rows, 'force_peak');
  const power = meanOf(rows, 'peak_power') ?? meanOf(rows, 'avg_propulsive_power');
  const height = meanOf(rows, 'jump_height_ft') ?? meanOf(rows, 'jump_height_ni');
  const rsi = meanOf(rows, 'rsi') ?? meanOf(rows, 'avg_rsi');
  const left = meanOf(rows, 'fp1_peak_force') ?? meanOf(rows, 'avg_braking_force');
  const right = meanOf(rows, 'fp2_peak_force') ?? meanOf(rows, 'avg_propulsive_force');

  const heightTrend = useMemo(() => trendByDate(rows, 'jump_height_ft'), [rows]);
  const peakTrend = useMemo(() => trendByDate(rows, 'peak_force'), [rows]);

  return (
    <Card className="p-4 space-y-4">
      <DashboardHeader
        icon={TrendingUp}
        title="Jump Force-Time Analysis"
        subtitle="Braking & propulsive phases, peak force/power, jump height and L/R asymmetry across the selected sessions."
        badges={sourceBadgesFor(rows)}
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Peak force" value={`${fmt(peak, 0)} N`} />
        <Stat label="Peak power" value={`${fmt(power, 0)} W`} />
        <Stat label="Jump height" value={`${fmt(height, 1)} cm`} hint="flight-time derived" />
        <Stat label="RSI" value={fmt(rsi, 2)} />
        <Stat label="L / R" value={`${fmt(left, 0)} / ${fmt(right, 0)}`} hint="N · braking vs propulsive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Jump height over time</h4>
          {heightTrend.length === 0 ? (
            <NoCurveNote message="No jump-height samples in this selection." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={heightTrend}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            {hasTrace ? 'Force / time trace' : 'Peak force per session'}
          </h4>
          {hasTrace ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rows.slice(0, 800).map((r, i) => ({
                i, value: num(flat(r.metrics).force ?? flat(r.metrics).force_n) ?? 0,
              }))}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : peakTrend.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={peakTrend}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoCurveNote message="No force/time curve available for this API result — only summary metrics were captured." />
          )}
        </Card>
      </div>
      <PhasePanel rows={rows} />
    </Card>
  );
};

// ----------------------------------------------------------------------------
// Isometric
// ----------------------------------------------------------------------------

const IsometricAnalysisInline = ({ rows }: { rows: AnalysisRow[] }) => {
  const peak = maxOf(rows, 'force_peak') ?? maxOf(rows, 'peak_force');
  const rfdMax = meanOf(rows, 'rfd_max');
  const peakLeft = meanOf(rows, 'force_peak_left');
  const peakRight = meanOf(rows, 'force_peak_right');
  const symmetry = meanOf(rows, 'force_peak_symmetry_index');

  const rfdProfile = useMemo(() => {
    const keys = ['rfd_50ms', 'rfd_100ms', 'rfd_150ms', 'rfd_200ms', 'rfd_250ms'];
    return keys.map((k) => ({ name: k.replace('rfd_', ''), value: meanOf(rows, k) ?? 0 }));
  }, [rows]);

  const forceProfile = useMemo(() => {
    const keys = ['force_50ms', 'force_100ms', 'force_150ms', 'force_200ms', 'force_250ms'];
    return keys.map((k) => ({ name: k.replace('force_', ''), value: meanOf(rows, k) ?? 0 }));
  }, [rows]);

  const peakTrend = useMemo(() => trendByDate(rows, 'force_peak'), [rows]);
  const hasAnyProfile = rfdProfile.some((p) => p.value > 0) || forceProfile.some((p) => p.value > 0);

  return (
    <Card className="p-4 space-y-4">
      <DashboardHeader
        icon={Activity}
        title="Isometric Force-Time Analysis"
        subtitle="Peak force, RFD curve, impulse, and bilateral comparison across the selected isometric sessions."
        badges={sourceBadgesFor(rows)}
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Peak force" value={`${fmt(peak, 0)} N`} />
        <Stat label="RFD max" value={`${fmt(rfdMax, 0)} N/s`} />
        <Stat label="Peak L" value={`${fmt(peakLeft, 0)} N`} />
        <Stat label="Peak R" value={`${fmt(peakRight, 0)} N`} />
        <Stat label="Symmetry index" value={fmt(symmetry, 1)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Force @ 50/100/150/200/250 ms</h4>
          {hasAnyProfile ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={forceProfile}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <NoCurveNote message="No force/time curve available for this result — only summary peak captured." />
          )}
        </Card>

        <Card className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">RFD profile</h4>
          {hasAnyProfile ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rfdProfile}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <NoCurveNote message="No RFD profile available — summary-only result." />
          )}
        </Card>
      </div>

      {peakTrend.length > 1 && (
        <Card className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Peak force over time</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={peakTrend}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <PhasePanel rows={rows} />
    </Card>
  );
};

// ----------------------------------------------------------------------------
// Balance
// ----------------------------------------------------------------------------

const BalanceAnalysisInline = ({ rows }: { rows: AnalysisRow[] }) => {
  const stability = meanOf(rows, 'stability_score') ?? meanOf(rows, 'sway_index');
  const left = meanOf(rows, 'left_pct') ?? meanOf(rows, 'fp1_load_pct');
  const right = meanOf(rows, 'right_pct') ?? meanOf(rows, 'fp2_load_pct');

  // CoP path: rows that include cop_x / cop_y per repetition
  const copPath = useMemo(() => rows.slice(0, 1000).map((r) => {
    const f = flat(r.metrics);
    const x = num(f.cop_x ?? f.copx);
    const y = num(f.cop_y ?? f.copy);
    return x !== null && y !== null ? { x, y } : null;
  }).filter(Boolean) as { x: number; y: number }[], [rows]);

  return (
    <Card className="p-4 space-y-4">
      <DashboardHeader
        icon={Scale}
        title="Balance / CoP Analysis"
        subtitle="Sway trace, CoP path, stability score and left/right balance distribution."
        badges={sourceBadgesFor(rows)}
      />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Stability score" value={fmt(stability, 1)} />
        <Stat label="Left load %" value={fmt(left, 1)} />
        <Stat label="Right load %" value={fmt(right, 1)} />
      </div>
      <Card className="p-3">
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Centre of Pressure path</h4>
        {copPath.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} />
              <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} />
              <ZAxis range={[40, 40]} />
              <Tooltip />
              <Scatter data={copPath} fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <NoCurveNote message="No CoP path available — this result only carries summary balance metrics." />
        )}
      </Card>
    </Card>
  );
};

// ----------------------------------------------------------------------------
// Generic timeline (fallback)
// ----------------------------------------------------------------------------

const GenericTimeline = ({ rows }: { rows: AnalysisRow[] }) => {
  const metricKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const f = flat(r.metrics);
      for (const [k, v] of Object.entries(f)) if (num(v) !== null) s.add(k);
    }
    return Array.from(s).sort();
  }, [rows]);
  const primary = metricKeys[0] ?? null;
  const trend = useMemo(() => (primary ? trendByDate(rows, primary) : []), [rows, primary]);

  return (
    <Card className="p-4 space-y-3">
      <DashboardHeader
        icon={Move}
        title="Performance timeline"
        subtitle={primary ? `Mean ${lbl(primary)} per session.` : 'Select a test type with numeric metrics.'}
        badges={sourceBadgesFor(rows)}
      />
      {trend.length === 0 ? (
        <NoCurveNote message="No numeric metrics available for these rows." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

// ----------------------------------------------------------------------------
// Golf scope (list of swing sessions + CTA into full dashboard)
// ----------------------------------------------------------------------------

const GolfScopeDashboard = ({ rows, onOpenGolfRow }: { rows: AnalysisRow[]; onOpenGolfRow?: (r: AnalysisRow) => void }) => {
  // Group by athlete + date + batch
  const groups = useMemo(() => {
    const map = new Map<string, AnalysisRow[]>();
    for (const r of rows) {
      const k = `${r.athlete_id ?? r.athlete_name}|${r.test_date}|${r.import_batch_id ?? r.file_hash ?? ''}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.values())
      .sort((a, b) => b[0].test_date.localeCompare(a[0].test_date))
      .slice(0, 12);
  }, [rows]);

  return (
    <Card className="p-4 space-y-3">
      <DashboardHeader
        icon={Target}
        title="Golf Swing Force Trace Analysis"
        subtitle="Multi-swing force traces, phase markers and CoP path per session. Click a session to open the full analysis."
        badges={sourceBadgesFor(rows)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {groups.map((g) => {
          const head = g[0];
          return (
            <button
              key={head.id}
              type="button"
              onClick={() => onOpenGolfRow?.(head)}
              className="text-left rounded-md border p-3 hover:bg-muted/40 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{head.athlete_name}</div>
                <Badge variant="outline">{g.length} samples</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(head.test_date), 'PP')} · {head.original_file_name ?? head.test_name}
              </div>
              <div className="mt-2 flex gap-1.5">
                <Badge variant="secondary">Golf swing</Badge>
                <Badge variant={head.source === 'api' ? 'outline' : 'secondary'}>
                  {head.source === 'manual_csv' ? 'CSV' : 'API'}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
      {groups.length === 0 && (
        <NoCurveNote message="No golf swing sessions in the current selection." />
      )}
    </Card>
  );
};
