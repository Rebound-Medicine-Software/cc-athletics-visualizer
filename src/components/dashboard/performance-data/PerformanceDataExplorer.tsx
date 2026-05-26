import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, BarChart, Bar, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import {
  Activity, Database, FileSpreadsheet, AlertTriangle,
  TrendingUp, ExternalLink, X, Sparkles,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { TEST_TYPES } from '@/lib/csv/testTypeConfig';
import { cn } from '@/lib/utils';

type Source = 'all' | 'api' | 'manual_csv';

interface TestRow {
  id: string;
  athlete_id: string | null;
  athlete_name: string;
  team_id: string | null;
  team_name: string;
  test_date: string;
  test_type: string;
  test_subtype: string | null;
  test_name: string;
  metrics: Record<string, any>;
  source: string;
  original_file_name: string | null;
  import_batch_id: string | null;
  file_hash: string | null;
  repetition_number: number;
}

const numeric = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * Flatten metrics for display: merges top-level numeric keys with anything
 * inside `_raw` (where CSV imports park unknown headers). Top-level wins.
 */
const flattenMetrics = (m: Record<string, any> | null | undefined): Record<string, any> => {
  if (!m) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === '_raw') continue;
    out[k] = v;
  }
  const raw = m._raw;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      const nk = k
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (nk && out[nk] === undefined) out[nk] = v;
    }
  }
  return out;
};

const metricLabel = (k: string) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const PerformanceDataExplorer = () => {
  const { teamId } = useEffectiveTeamId();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<{
    teamId: string | null;
    athleteId: string | null;
    testType: string | null;
    testSubtype: string | null;
    source: Source;
    fromDate: string;
    toDate: string;
    metric: string | null;
  }>(() => ({
    teamId: searchParams.get('teamId') || teamId || null,
    athleteId: searchParams.get('athleteId'),
    testType: searchParams.get('testType'),
    testSubtype: searchParams.get('testSubtype'),
    source: (searchParams.get('source') as Source) || 'all',
    fromDate: format(subDays(new Date(), 180), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    metric: null,
  }));

  const [detailRow, setDetailRow] = useState<TestRow | null>(null);

  // Sync ?athleteId/testType params once on mount handled above; clear them now.
  useEffect(() => {
    if (searchParams.get('athleteId') || searchParams.get('testType') || searchParams.get('source')) {
      const next = new URLSearchParams(searchParams);
      ['athleteId', 'testType', 'testSubtype', 'source', 'teamId'].forEach((k) => next.delete(k));
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- queries --------
  const teamsQuery = useQuery({
    queryKey: ['perf-explorer:teams', teamId],
    queryFn: async () => {
      let q = supabase.from('teams').select('id, name').order('name');
      if (teamId) q = q.or(`id.eq.${teamId},parent_team_id.eq.${teamId}`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const athletesQuery = useQuery({
    queryKey: ['perf-explorer:athletes', filters.teamId],
    queryFn: async () => {
      let q = supabase.from('athletes').select('id, name, team_id').order('name');
      if (filters.teamId) q = q.eq('team_id', filters.teamId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const dataQuery = useQuery({
    queryKey: ['perf-explorer:tests', filters],
    queryFn: async (): Promise<TestRow[]> => {
      let q = supabase
        .from('test_data')
        .select(
          'id, athlete_id, athlete_name, team_id, team_name, test_date, test_type, test_subtype, test_name, metrics, source, original_file_name, import_batch_id, file_hash, repetition_number',
        )
        .gte('test_date', filters.fromDate)
        .lte('test_date', filters.toDate)
        .order('test_date', { ascending: false })
        .limit(1000);

      if (filters.teamId) q = q.eq('team_id', filters.teamId);
      if (filters.athleteId) q = q.eq('athlete_id', filters.athleteId);
      if (filters.testType) q = q.eq('test_type', filters.testType);
      if (filters.testSubtype) q = q.eq('test_subtype', filters.testSubtype);
      if (filters.source !== 'all') q = q.eq('source', filters.source);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TestRow[];
    },
  });

  const rows = dataQuery.data ?? [];

  // Precompute flattened metrics per row (handles legacy `_raw` payloads from CSV).
  const flatMetricsById = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    for (const r of rows) map.set(r.id, flattenMetrics(r.metrics));
    return map;
  }, [rows]);
  const getMetric = (row: TestRow, key: string | null) =>
    key ? numeric(flatMetricsById.get(row.id)?.[key]) : null;

  // Available metrics from data
  const metricKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const flat = flatMetricsById.get(r.id) ?? {};
      Object.entries(flat).forEach(([k, v]) => {
        if (numeric(v) !== null) set.add(k);
      });
    }
    return Array.from(set).sort();
  }, [rows, flatMetricsById]);

  const activeMetric = filters.metric ?? metricKeys[0] ?? null;

  // KPI calcs
  const kpis = useMemo(() => {
    const apiCount = rows.filter((r) => r.source === 'api').length;
    const csvCount = rows.filter((r) => r.source === 'manual_csv').length;
    const latest = rows[0]?.test_date ?? null;

    // duplicate detection: same athlete+test_name+test_date+rep across different sources
    const dupKey = new Map<string, TestRow[]>();
    for (const r of rows) {
      const k = `${r.athlete_id}|${r.test_name}|${r.test_date}|${r.repetition_number}`;
      if (!dupKey.has(k)) dupKey.set(k, []);
      dupKey.get(k)!.push(r);
    }
    const conflicts = Array.from(dupKey.values()).filter((arr) => arr.length > 1).length;

    // best improvement on active metric
    let bestDelta: { pct: number; metric: string } | null = null;
    if (activeMetric) {
      const byAthlete = new Map<string, TestRow[]>();
      for (const r of rows) {
        if (!r.athlete_id) continue;
        if (getMetric(r, activeMetric) === null) continue;
        if (!byAthlete.has(r.athlete_id)) byAthlete.set(r.athlete_id, []);
        byAthlete.get(r.athlete_id)!.push(r);
      }
      for (const arr of byAthlete.values()) {
        const sorted = arr.slice().sort((a, b) => a.test_date.localeCompare(b.test_date));
        const first = getMetric(sorted[0], activeMetric);
        const last = getMetric(sorted[sorted.length - 1], activeMetric);
        if (first && last && first > 0) {
          const pct = ((last - first) / first) * 100;
          if (!bestDelta || pct > bestDelta.pct) bestDelta = { pct, metric: activeMetric };
        }
      }
    }

    return { total: rows.length, apiCount, csvCount, conflicts, latest, bestDelta };
  }, [rows, activeMetric]);

  // Timeline data
  const timeline = useMemo(() => {
    if (!activeMetric) return [];
    return rows
      .map((r) => {
        const v = getMetric(r, activeMetric);
        if (v === null) return null;
        return {
          date: r.test_date,
          value: v,
          source: r.source,
          row: r,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.date.localeCompare(b.date)) as any[];
  }, [rows, activeMetric]);

  // Source comparison: for each conflict key, compare api vs csv on active metric
  const sourceCompare = useMemo(() => {
    if (!activeMetric) return [];
    const byKey = new Map<string, { date: string; api?: number; csv?: number; row?: TestRow }>();
    for (const r of rows) {
      const v = getMetric(r, activeMetric);
      if (v === null) continue;
      const k = `${r.athlete_name}|${r.test_name}|${r.test_date}|${r.repetition_number}`;
      const entry = byKey.get(k) ?? { date: r.test_date, row: r };
      if (r.source === 'api') entry.api = v;
      if (r.source === 'manual_csv') entry.csv = v;
      byKey.set(k, entry);
    }
    return Array.from(byKey.values())
      .filter((e) => e.api !== undefined && e.csv !== undefined)
      .map((e) => ({
        ...e,
        delta: e.api && e.csv ? Math.abs(e.api - e.csv) / Math.max(e.api, e.csv) : 0,
        match: e.api && e.csv ? Math.abs(e.api - e.csv) / Math.max(e.api, e.csv) <= 0.01 : false,
      }))
      .slice(0, 20);
  }, [rows, activeMetric]);

  const subtypes = filters.testType
    ? TEST_TYPES.find((t) => t.id === filters.testType)?.subtypes ?? []
    : [];

  // -------- render --------
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Performance Data"
        description="Review API-synced and manually uploaded test results, compare sources, and validate data before athlete publishing."
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <FilterSelect
            label="Team"
            value={filters.teamId ?? '__all'}
            onChange={(v) => setFilters((f) => ({ ...f, teamId: v === '__all' ? null : v, athleteId: null }))}
            options={[{ value: '__all', label: 'All teams' }, ...(teamsQuery.data ?? []).map((t: any) => ({ value: t.id, label: t.name }))]}
          />
          <FilterSelect
            label="Athlete"
            value={filters.athleteId ?? '__all'}
            onChange={(v) => setFilters((f) => ({ ...f, athleteId: v === '__all' ? null : v }))}
            options={[{ value: '__all', label: 'All athletes' }, ...(athletesQuery.data ?? []).map((a: any) => ({ value: a.id, label: a.name }))]}
          />
          <FilterSelect
            label="Test type"
            value={filters.testType ?? '__all'}
            onChange={(v) => setFilters((f) => ({ ...f, testType: v === '__all' ? null : v, testSubtype: null }))}
            options={[{ value: '__all', label: 'All types' }, ...TEST_TYPES.map((t) => ({ value: t.id, label: t.label }))]}
          />
          <FilterSelect
            label="Subtype"
            value={filters.testSubtype ?? '__all'}
            onChange={(v) => setFilters((f) => ({ ...f, testSubtype: v === '__all' ? null : v }))}
            options={[{ value: '__all', label: 'All subtypes' }, ...subtypes.map((s) => ({ value: s.id, label: s.label }))]}
            disabled={!subtypes.length}
          />
          <FilterSelect
            label="Source"
            value={filters.source}
            onChange={(v) => setFilters((f) => ({ ...f, source: v as Source }))}
            options={[
              { value: 'all', label: 'All sources' },
              { value: 'api', label: 'API' },
              { value: 'manual_csv', label: 'Manual CSV' },
            ]}
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <Input type="date" value={filters.fromDate} onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Input type="date" value={filters.toDate} onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))} />
          </div>
          <FilterSelect
            label="Metric"
            value={activeMetric ?? '__none'}
            onChange={(v) => setFilters((f) => ({ ...f, metric: v === '__none' ? null : v }))}
            options={metricKeys.length
              ? metricKeys.map((m) => ({ value: m, label: metricLabel(m) }))
              : [{ value: '__none', label: 'No metrics available' }]}
            disabled={!metricKeys.length}
          />
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={Database} label="Total tests" value={kpis.total} />
        <KpiCard icon={Activity} label="API rows" value={kpis.apiCount} tone="info" />
        <KpiCard icon={FileSpreadsheet} label="Manual CSV" value={kpis.csvCount} tone="accent" />
        <KpiCard icon={AlertTriangle} label="Conflicts" value={kpis.conflicts} tone={kpis.conflicts ? 'warn' : 'muted'} />
        <KpiCard
          icon={TrendingUp}
          label="Best improvement"
          value={kpis.bestDelta ? `${kpis.bestDelta.pct >= 0 ? '+' : ''}${kpis.bestDelta.pct.toFixed(1)}%` : '—'}
          tone="success"
        />
      </div>

      {/* Timeline chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Athlete test timeline</h3>
            <p className="text-xs text-muted-foreground">
              {activeMetric ? metricLabel(activeMetric) : 'Select a metric to plot'}
              {kpis.latest && <> · Latest test {format(new Date(kpis.latest), 'PP')}</>}
            </p>
          </div>
        </div>
        {timeline.length === 0 ? (
          <EmptyChart message="No measurements for the selected filters." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeline}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="rounded-md border bg-background/95 backdrop-blur p-2 text-xs shadow-md">
                      <div className="font-medium">{format(new Date(p.date), 'PP')}</div>
                      <div>{metricLabel(activeMetric!)}: <b>{p.value.toFixed(2)}</b></div>
                      <div className="text-muted-foreground capitalize">{p.source.replace('_', ' ')}</div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const isCsv = props.payload.source === 'manual_csv';
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={isCsv ? 'hsl(var(--accent-foreground, var(--primary)))' : 'hsl(var(--primary))'}
                      stroke={isCsv ? 'hsl(var(--accent))' : 'hsl(var(--background))'}
                      strokeWidth={2}
                      onClick={() => setDetailRow(props.payload.row)}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
                isAnimationActive
                animationDuration={700}
              />
              {timeline.length > 0 && (
                <ReferenceDot
                  x={timeline[timeline.length - 1].date}
                  y={timeline[timeline.length - 1].value}
                  r={7}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={3}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <Badge variant="outline">API</Badge>
          <Badge variant="secondary">Manual CSV</Badge>
        </div>
      </Card>

      {/* Source comparison */}
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-1">API vs Manual CSV</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Side-by-side comparison where the same test exists in both sources. Tolerance ±1%.
        </p>
        {sourceCompare.length === 0 ? (
          <EmptyChart message="No overlapping API/CSV measurements for this metric." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sourceCompare.map((s, i) => ({
              name: `${format(new Date(s.date), 'MMM d')} · ${s.row?.athlete_name?.split(' ')[0] ?? ''} #${s.row?.repetition_number ?? ''}`,
              API: s.api,
              CSV: s.csv,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="API" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={700} />
              <Bar dataKey="CSV" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Session table */}
      <Card className="p-4">
        <h3 className="text-base font-semibold mb-3">Test sessions</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>File / Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {rows.slice(0, 100).map((r) => {
                  const v = activeMetric ? getMetric(r, activeMetric) : null;
                  const isConflict = rows.some(
                    (other) =>
                      other.id !== r.id &&
                      other.athlete_id === r.athlete_id &&
                      other.test_name === r.test_name &&
                      other.test_date === r.test_date &&
                      other.repetition_number === r.repetition_number &&
                      other.source !== r.source,
                  );
                  return (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-muted/40 cursor-pointer"
                      onClick={() => setDetailRow(r)}
                    >
                      <TableCell>{format(new Date(r.test_date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{r.athlete_name}</TableCell>
                      <TableCell>
                        {r.test_name}
                        {r.test_subtype && <span className="text-muted-foreground"> · {r.test_subtype}</span>}
                      </TableCell>
                      <TableCell>
                        {activeMetric && v !== null ? (
                          <span className="font-mono">{v.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.source === 'api' ? 'outline' : 'secondary'}>
                          {r.source === 'manual_csv' ? 'CSV' : 'API'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {r.original_file_name ?? '—'}
                      </TableCell>
                      <TableCell>
                        {isConflict ? (
                          <Badge variant="destructive">Conflict</Badge>
                        ) : r.source === 'manual_csv' ? (
                          <Badge>Imported</Badge>
                        ) : (
                          <Badge variant="outline">Synced</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    No test rows match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailRow && <TestDetail row={detailRow} allRows={rows} onClose={() => setDetailRow(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ---------- subcomponents ----------

const FilterSelect = ({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent className="z-[1500]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const KpiCard = ({
  icon: Icon, label, value, tone = 'muted',
}: {
  icon: any;
  label: string;
  value: string | number;
  tone?: 'muted' | 'info' | 'accent' | 'warn' | 'success';
}) => {
  const toneClass: Record<string, string> = {
    muted: 'text-muted-foreground bg-muted',
    info: 'text-primary bg-primary/10',
    accent: 'text-foreground bg-accent',
    warn: 'text-amber-600 bg-amber-500/10',
    success: 'text-emerald-600 bg-emerald-500/10',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', toneClass[tone])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold tabular-nums">{value}</div>
        </div>
      </Card>
    </motion.div>
  );
};

const EmptyChart = ({ message }: { message: string }) => (
  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
    {message}
  </div>
);

const TestDetail = ({
  row, allRows, onClose,
}: { row: TestRow; allRows: TestRow[]; onClose: () => void }) => {
  const related = allRows.find(
    (r) =>
      r.id !== row.id &&
      r.athlete_id === row.athlete_id &&
      r.test_name === row.test_name &&
      r.test_date === row.test_date &&
      r.repetition_number === row.repetition_number,
  );

  const metricEntries = Object.entries(row.metrics ?? {}).filter(([, v]) => v !== null && v !== '');

  return (
    <div className="space-y-5">
      <SheetHeader>
        <div className="flex items-start justify-between">
          <div>
            <SheetTitle>{row.athlete_name}</SheetTitle>
            <div className="text-sm text-muted-foreground">
              {row.test_name}{row.test_subtype && ` · ${row.test_subtype}`}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </SheetHeader>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Date" value={format(new Date(row.test_date), 'PPP')} />
        <Field label="Source" value={<Badge variant={row.source === 'api' ? 'outline' : 'secondary'}>{row.source === 'manual_csv' ? 'Manual CSV' : 'API'}</Badge>} />
        <Field label="Team" value={row.team_name || '—'} />
        <Field label="Rep #" value={String(row.repetition_number)} />
        {row.original_file_name && <Field label="File" value={<span className="text-xs break-all">{row.original_file_name}</span>} />}
        {row.import_batch_id && <Field label="Batch" value={<span className="text-xs font-mono">{row.import_batch_id.slice(0, 8)}…</span>} />}
      </div>

      {related && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <AlertTriangle className="w-4 h-4" /> Matching {related.source === 'api' ? 'API' : 'CSV'} record found
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            A {related.source.replace('_', ' ')} record exists for the same athlete, test, date, and repetition. Review for drift.
          </div>
        </Card>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Metrics ({metricEntries.length})</h4>
        <div className="grid grid-cols-2 gap-2">
          {metricEntries.map(([k, v]) => (
            <div key={k} className="rounded-md border p-2">
              <div className="text-[10px] uppercase text-muted-foreground">{metricLabel(k)}</div>
              <div className="font-mono text-sm">{String(v)}</div>
            </div>
          ))}
          {metricEntries.length === 0 && (
            <div className="text-xs text-muted-foreground col-span-2">No metrics captured.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-0.5">{value}</div>
  </div>
);
