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
  type PhaseAnalysis, type TraceSample,
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
  const primaryType = useMemo(() => {
    if (selectedTestType) return selectedTestType.toLowerCase();
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

const PhasePanel = ({ rows }: { rows: AnalysisRow[] }) => {
  // Best-effort: try to build a trace from rows that share an athlete/date/batch
  // and contain a `force` / `force_n` sample per repetition. If not present,
  // fall back to per-row summary analysis using the first representative row.
  const analysis = useMemo<PhaseAnalysis | null>(() => {
    if (rows.length === 0) return null;
    const head = rows[0];
    const kind = inferTestKind(head.test_type, head.test_subtype, head.test_name);

    // Attempt trace assembly (CSV with sample-level rows)
    const sameGroup = rows.filter(
      (r) =>
        r.athlete_id === head.athlete_id &&
        r.test_date === head.test_date &&
        (r.import_batch_id ?? r.file_hash) === (head.import_batch_id ?? head.file_hash),
    );
    const sampleRate = 1000; // assume 1 kHz when t missing
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
    const bodyMassKg = Number((head.metrics as any)?.body_mass) || undefined;
    if (samples.length > 32) {
      samples.sort((a, b) => a.t - b.t);
      return analyseTrace(samples, { test: kind, bodyMassKg });
    }
    return analyseSummary(kind, head.metrics ?? {});
  }, [rows]);

  if (!analysis) return null;

  const sl = analysis.springLike;
  const slR = sl.r === null ? '—' : sl.r.toFixed(2);
  const sscLabel = analysis.sscCategory === 'unknown' ? 'SSC: unknown (no trace)' : `SSC: ${analysis.sscCategory.toUpperCase()}`;
  const traceLocked = !analysis.hasTrace;

  return (
    <Card className="p-4 space-y-3 border-primary/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Movement phase analysis</h4>
          <p className="text-xs text-muted-foreground">
            Phase detection {analysis.hasTrace ? 'from force-time trace' : 'from summary metrics (no curve in source)'} · Pedley et al. (2023) spring-like correlation
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={SSC_TONE[analysis.sscCategory]} variant="outline">{sscLabel}</Badge>
          <Badge variant="outline">Spring-like r: {slR}</Badge>
          <Badge variant="outline">
            Spring-like: {sl.isSpringLike === null ? '—' : sl.isSpringLike ? 'Yes' : 'No'}
          </Badge>
        </div>
      </div>

      {traceLocked && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
            <span className="uppercase tracking-wide text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">Locked</span>
            Pedley spring-like correlation unavailable
          </div>
          <p className="text-muted-foreground">
            Requires raw vertical force-time samples (with body mass &amp; landing/take-off detection)
            to compute the Pearson r between CoM displacement and absolute vertical force during ground
            contact. The current source only provides summary metrics — no force-time curve.
          </p>
          <p className="text-muted-foreground">
            To unlock: import a raw force-trace CSV for this rep, or enable raw force-trace sync on the
            CC Athletics API.
          </p>
        </div>
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

      {analysis.modelled && (
        <Card className="p-3">
          <h5 className="text-xs font-semibold text-muted-foreground mb-2">Modelled (half-sine) vs actual force</h5>
          <ResponsiveContainer width="100%" height={180}>
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
          <ul className="mt-2 text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
            {analysis.modelled.insights.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </Card>
      )}

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

      {!analysis.hasTrace && (
        <p className="text-[11px] text-muted-foreground italic">
          No force-time curve available for phase analysis — showing summary-derived phases only.
        </p>
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
