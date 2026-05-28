import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ReferenceLine, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Sparkles, Trophy, Play, Pause, RotateCcw } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  analyseSwings, buildSamples, interpretSwing,
  type DetectionResult, type Sample, type SwingWindow,
} from '@/lib/golf/swingAnalysis';

interface Props {
  batchId: string | null;
  athleteId?: string | null;
  athleteName: string;
  testDate: string;
  fileHash?: string | null;
  originalFileName?: string | null;
  row?: any;
}

const PHASE_COLORS: Record<string, string> = {
  'Address': 'hsl(220 10% 60%)',
  'Start of backswing': 'hsl(200 80% 55%)',
  'Top of swing': 'hsl(280 70% 60%)',
  'Transition': 'hsl(45 90% 55%)',
  'Downswing': 'hsl(25 90% 55%)',
  'Impact': 'hsl(0 80% 55%)',
  'Follow-through': 'hsl(160 60% 50%)',
  'Finish': 'hsl(220 10% 60%)',
};

const SAMPLE_RATE = 1000;

export const GolfSwingAnalysis = ({
  batchId, athleteId, athleteName, testDate, fileHash, originalFileName, row,
}: Props) => {
  const samplesQuery = useQuery({
    queryKey: ['golf-swing-batch', batchId, athleteId, testDate, fileHash, originalFileName],
    queryFn: async () => {
      const chunkSize = 1000;
      const fetchAll = async (
        build: (from: number, to: number) => any,
      ) => {
        let from = 0;
        const all: any[] = [];
        while (true) {
          const { data, error } = await build(from, from + chunkSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < chunkSize) break;
          from += chunkSize;
        }
        return all;
      };

      // 1. Prefer import_batch_id
      if (batchId) {
        return await fetchAll((from, to) =>
          supabase
            .from('test_data')
            .select('repetition_number, metrics, created_at')
            .eq('import_batch_id', batchId)
            .order('repetition_number', { ascending: true })
            .range(from, to),
        );
      }

      // 2. Fallback: file_hash
      if (fileHash) {
        return await fetchAll((from, to) =>
          supabase
            .from('test_data')
            .select('repetition_number, metrics, created_at')
            .eq('file_hash', fileHash)
            .order('repetition_number', { ascending: true })
            .range(from, to),
        );
      }

      // 3. Fallback: athlete + date + test_type
      if (athleteId && testDate) {
        return await fetchAll((from, to) =>
          supabase
            .from('test_data')
            .select('repetition_number, metrics, created_at')
            .eq('athlete_id', athleteId)
            .eq('test_date', testDate)
            .eq('test_type', 'movement')
            .order('repetition_number', { ascending: true })
            .range(from, to),
        );
      }

      return [];
    },
  });

  const analysis: DetectionResult | null = useMemo(() => {
    if (!samplesQuery.data) return null;
    const samples = buildSamples(samplesQuery.data as any, SAMPLE_RATE);
    return analyseSwings(samples, SAMPLE_RATE);
  }, [samplesQuery.data]);

  const [selectedSwing, setSelectedSwing] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('weight');

  useEffect(() => {
    if (analysis?.bestSwingIndex != null) setSelectedSwing(analysis.bestSwingIndex);
  }, [analysis?.bestSwingIndex]);

  if (samplesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <GolfActiveHeader />
        <div className="p-8 text-sm text-muted-foreground">Loading force trace…</div>
      </div>
    );
  }
  if (samplesQuery.error) {
    return (
      <div className="space-y-4">
        <GolfActiveHeader />
        <div className="p-8 text-sm text-destructive space-y-1">
          <div className="font-medium">Could not load swing batch.</div>
          <div className="text-xs text-muted-foreground">{(samplesQuery.error as Error).message}</div>
        </div>
      </div>
    );
  }
  const rawRows = samplesQuery.data ?? [];
  if (!analysis || analysis.samples.length === 0) {
    const reasons: string[] = [];
    if (!batchId && !fileHash && !athleteId) reasons.push('No import_batch_id, file_hash, or athlete_id available on the selected row.');
    if (rawRows.length === 0) reasons.push('No rows returned for this batch / athlete+date / file_hash.');
    if (rawRows.length > 0) {
      const sample = rawRows[0]?.metrics ?? {};
      const flat = { ...(sample as any), ...((sample as any)?._raw ?? {}) };
      const has = ['fp1_bl','fp1_br','fp1_fr','fp1_fl','fp2_bl','fp2_br','fp2_fr','fp2_fl']
        .filter((k) => k in flat);
      if (has.length === 0) reasons.push('Force plate channels (fp1_*/fp2_*) not present in metrics payload.');
    }
    return (
      <div className="space-y-4">
        <GolfActiveHeader />
        <div className="p-8 space-y-3">
          <div className="text-sm font-medium">Golf Swing Analysis unavailable</div>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            {reasons.length === 0 ? <li>Insufficient samples to detect a swing window.</li> : reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <div className="text-[10px] text-muted-foreground pt-2 border-t">
            batchId: {batchId ?? '—'} · athleteId: {athleteId ?? '—'} · date: {testDate} · rows: {rawRows.length}
          </div>
        </div>
      </div>
    );
  }

  const swing = analysis.swings[selectedSwing];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <GolfActiveHeader />
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Golf Swing Analysis · {testDate}
            </div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> {athleteName}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.samples.length.toLocaleString()} samples · {analysis.swings.length} swing{analysis.swings.length === 1 ? '' : 's'} detected ·
              baseline {analysis.baselineMean.toFixed(2)}N ± {analysis.baselineSd.toFixed(3)}N (±5 SD)
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.swings.map((s, idx) => (
              <Button
                key={s.index}
                size="sm"
                variant={idx === selectedSwing ? 'default' : 'outline'}
                className={cn('h-8', analysis.bestSwingIndex === idx && 'ring-2 ring-primary/40')}
                onClick={() => setSelectedSwing(idx)}
              >
                {analysis.bestSwingIndex === idx && <Trophy className="w-3 h-3 mr-1" />}
                Swing #{s.index}
              </Button>
            ))}
          </div>
        </div>

        {/* Overview trace */}
        <Card className="p-3">
          <div className="text-xs font-medium mb-2">Full session · total force trace</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={analysis.samples.map((s) => ({ i: s.i, total: s.total }))}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="i" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={40} />
              <Tooltip
                formatter={(v: number) => v.toFixed(2)}
                labelFormatter={(l) => `Sample ${l}`}
                contentStyle={{ fontSize: 11 }}
              />
              <ReferenceLine y={analysis.baselineMean + 5 * analysis.baselineSd} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <ReferenceLine y={analysis.baselineMean - 5 * analysis.baselineSd} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              {analysis.swings.map((s, idx) => (
                <ReferenceArea
                  key={s.index}
                  x1={analysis.samples[s.startIdx]?.i}
                  x2={analysis.samples[s.endIdx]?.i}
                  fill={idx === selectedSwing ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                  fillOpacity={idx === selectedSwing ? 0.18 : 0.08}
                  onClick={() => setSelectedSwing(idx)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={1.2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {!swing && (
          <Card className="p-6 text-sm text-muted-foreground">
            No swing matched the ±5 SD baseline threshold. The signal may be too flat or too noisy.
            Inspect raw fp1/fp2 channels for sensor offsets.
          </Card>
        )}

        {swing && (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            {/* LEFT — metrics */}
            <Card className="p-4 space-y-3 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Swing #{swing.index}
                </div>
                {analysis.bestSwingIndex === selectedSwing && (
                  <Badge className="gap-1"><Trophy className="w-3 h-3" /> Best</Badge>
                )}
              </div>
              <Metric label="Handedness" value="Right-handed (assumed)" hint="Trail-foot = right plate (fp2)." />
              <Metric
                label="Peak Impact Force"
                value={`${swing.metrics.peakImpactForce.toFixed(1)} N`}
                hint="Combined vertical force at detected impact event."
              />
              <Metric
                label="Peak Weight Shift"
                value={`${swing.metrics.peakWeightShiftPct.toFixed(1)} %`}
                hint="Max lateral pressure deviation from 50/50 during swing."
              />
              <Metric
                label="Tempo Ratio"
                value={`${swing.metrics.tempoRatio.toFixed(2)} : 1`}
                hint="Backswing duration ÷ downswing duration. Tour avg ≈ 3:1."
              />
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Backswing" value={`${(swing.metrics.backswingDurationS * 1000).toFixed(0)} ms`} />
                <Metric label="Downswing" value={`${(swing.metrics.downswingDurationS * 1000).toFixed(0)} ms`} />
                <Metric label="Transition" value={`${(swing.metrics.transitionDurationS * 1000).toFixed(0)} ms`} />
                <Metric label="Total" value={`${(swing.metrics.totalSwingDurationS * 1000).toFixed(0)} ms`} />
              </div>
              <Metric
                label="Lead / Trail at impact"
                value={`${swing.metrics.leftDistributionPctAtImpact.toFixed(0)}% / ${swing.metrics.rightDistributionPctAtImpact.toFixed(0)}%`}
                hint="Pressure split between left (lead) and right (trail) plates at impact."
              />
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Peak Left" value={`${swing.metrics.peakLeftLoad.toFixed(1)} N`} />
                <Metric label="Peak Right" value={`${swing.metrics.peakRightLoad.toFixed(1)} N`} />
              </div>
              <Metric
                label="Force Symmetry"
                value={`${swing.metrics.forceSymmetryPct.toFixed(0)} %`}
                hint="100% = perfectly balanced peak loads."
              />
              <Metric
                label="Consistency"
                value={`${analysis.consistencyScore.toFixed(0)} %`}
                hint="Higher = more repeatable peak impact across swings."
              />
            </Card>

            {/* RIGHT — analysis */}
            <div className="space-y-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="weight">Weight Dist.</TabsTrigger>
                  <TabsTrigger value="torque">Torque</TabsTrigger>
                  <TabsTrigger value="horizontal">Horizontal</TabsTrigger>
                  <TabsTrigger value="force">Force</TabsTrigger>
                  <TabsTrigger value="cop">CoP Path</TabsTrigger>
                </TabsList>

                <TabsContent value="weight">
                  <SwingChart
                    swing={swing}
                    samples={analysis.samples}
                    series={[
                      { key: 'leftPct', label: 'Left %', stroke: 'hsl(200 80% 55%)' },
                      { key: 'rightPct', label: 'Right %', stroke: 'hsl(15 90% 55%)' },
                    ]}
                    compute={(s) => {
                      const tot = Math.abs(s.fp1Total) + Math.abs(s.fp2Total);
                      const leftPct = tot > 0 ? (Math.abs(s.fp1Total) / tot) * 100 : 50;
                      return { leftPct, rightPct: 100 - leftPct };
                    }}
                    yLabel="%"
                  />
                </TabsContent>

                <TabsContent value="torque">
                  <SwingChart
                    swing={swing}
                    samples={analysis.samples}
                    series={[
                      { key: 'leadTorque', label: 'Lead torque', stroke: 'hsl(200 80% 55%)' },
                      { key: 'trailTorque', label: 'Trail torque', stroke: 'hsl(15 90% 55%)' },
                    ]}
                    compute={(s) => ({
                      // Proxy: front-back differential × plate side
                      leadTorque: (s.fp1.fr + s.fp1.fl) - (s.fp1.br + s.fp1.bl),
                      trailTorque: (s.fp2.fr + s.fp2.fl) - (s.fp2.br + s.fp2.bl),
                    })}
                    yLabel="N"
                  />
                </TabsContent>

                <TabsContent value="horizontal">
                  <SwingChart
                    swing={swing}
                    samples={analysis.samples}
                    series={[
                      { key: 'leftHoriz', label: 'Left M-L', stroke: 'hsl(200 80% 55%)' },
                      { key: 'rightHoriz', label: 'Right M-L', stroke: 'hsl(15 90% 55%)' },
                    ]}
                    compute={(s) => ({
                      leftHoriz: (s.fp1.fr + s.fp1.br) - (s.fp1.fl + s.fp1.bl),
                      rightHoriz: (s.fp2.fr + s.fp2.br) - (s.fp2.fl + s.fp2.bl),
                    })}
                    yLabel="N"
                  />
                </TabsContent>

                <TabsContent value="force">
                  <SwingChart
                    swing={swing}
                    samples={analysis.samples}
                    series={[
                      { key: 'left', label: 'Left total', stroke: 'hsl(200 80% 55%)' },
                      { key: 'right', label: 'Right total', stroke: 'hsl(15 90% 55%)' },
                      { key: 'total', label: 'Combined', stroke: 'hsl(var(--primary))', strokeWidth: 2 },
                    ]}
                    compute={(s) => ({ left: s.fp1Total, right: s.fp2Total, total: s.total })}
                    yLabel="N"
                  />
                </TabsContent>

                <TabsContent value="cop">
                  <CopPathPanel swing={swing} samples={analysis.samples} />
                </TabsContent>
              </Tabs>

              {/* Interpretation + prescription */}
              <Card className="p-4 space-y-2 border-primary/30">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="w-4 h-4 text-primary" /> Practitioner interpretation
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {interpretSwing(swing).map((l, i) => <li key={i}>{l}</li>)}
                </ul>
                <div className="pt-2 border-t flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground italic">
                    Suggestion only — does not auto-generate a programme.
                  </div>
                  <Button size="sm" variant="outline" className="h-7">
                    <Sparkles className="w-3 h-3 mr-1" /> Use for prescription
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// ---------- Subcomponents ----------

const GolfActiveHeader = () => (
  <div className="rounded-md border border-primary/40 bg-primary/10 p-3">
    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">
      <Activity className="w-4 h-4" /> GOLF SWING ANALYSIS ACTIVE
    </div>
  </div>
);

const Metric = ({ label, value, hint }: { label: string; value: string; hint?: string }) => {
  const inner = (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
  if (!hint) return inner;
  return (
    <UiTooltip>
      <TooltipTrigger asChild><div className="cursor-help">{inner}</div></TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-xs">{hint}</TooltipContent>
    </UiTooltip>
  );
};

interface SwingChartProps {
  swing: SwingWindow;
  samples: Sample[];
  series: { key: string; label: string; stroke: string; strokeWidth?: number }[];
  compute: (s: Sample) => Record<string, number>;
  yLabel: string;
}

const SwingChart = ({ swing, samples, series, compute, yLabel }: SwingChartProps) => {
  const data = useMemo(() => {
    const slice = samples.slice(swing.startIdx, swing.endIdx + 1);
    return slice.map((s) => ({ i: s.i, ...compute(s) }));
  }, [swing, samples, compute]);

  return (
    <Card className="p-3">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="i" tick={{ fontSize: 10 }} label={{ value: 'Sample', position: 'insideBottom', offset: -2, fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={42} label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(v: number) => (typeof v === 'number' ? v.toFixed(2) : v)}
            labelFormatter={(l) => `Sample ${l}`}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth ?? 1.5}
              dot={false}
              isAnimationActive
              animationDuration={500}
            />
          ))}
          {swing.phases.map((p) => (
            <ReferenceLine
              key={p.name}
              x={samples[p.idx]?.i}
              stroke={PHASE_COLORS[p.name]}
              strokeDasharray="4 2"
              strokeWidth={1.2}
              label={{
                value: shortPhase(p.name),
                position: 'top',
                fontSize: 9,
                fill: PHASE_COLORS[p.name],
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {swing.phases.map((p) => (
          <span key={p.name} className="text-[10px] flex items-center gap-1 text-muted-foreground">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: PHASE_COLORS[p.name] }} />
            {p.name}
          </span>
        ))}
      </div>
    </Card>
  );
};

function shortPhase(n: string) {
  return n
    .replace('Start of backswing', 'Start')
    .replace('Top of swing', 'Top')
    .replace('Follow-through', 'Follow');
}

// ---------- CoP path ----------

const CopPathPanel = ({ swing, samples }: { swing: SwingWindow; samples: Sample[] }) => {
  const slice = samples.slice(swing.startIdx, swing.endIdx + 1);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(slice.length - 1);
  const raf = useRef<number | null>(null);

  useEffect(() => { setFrame(slice.length - 1); }, [swing.index]);

  useEffect(() => {
    if (!playing) return;
    const step = () => {
      setFrame((f) => {
        if (f >= slice.length - 1) { setPlaying(false); return f; }
        return f + Math.max(1, Math.floor(slice.length / 240));
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, slice.length]);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium">Centre of Pressure · animated path</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => { setFrame(0); setPlaying(false); }}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CopFootPlate label="Lead foot (Left plate)" points={slice.map((s) => s.cop1)} frame={frame} colorFrom="hsl(200 80% 55%)" colorTo="hsl(280 70% 60%)" />
        <CopFootPlate label="Trail foot (Right plate)" points={slice.map((s) => s.cop2)} frame={frame} colorFrom="hsl(15 90% 55%)" colorTo="hsl(45 90% 55%)" />
      </div>
      <input
        type="range"
        min={0}
        max={slice.length - 1}
        value={frame}
        onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
        className="w-full accent-primary"
      />
      <div className="text-[10px] text-muted-foreground text-center">
        Sample {samples[swing.startIdx + frame]?.i ?? '—'} of swing window
      </div>
    </Card>
  );
};

const CopFootPlate = ({
  label, points, frame, colorFrom, colorTo,
}: {
  label: string;
  points: (Sample['cop1'])[];
  frame: number;
  colorFrom: string;
  colorTo: string;
}) => {
  const size = 200;
  // Map -1..1 → padding..size-padding
  const pad = 12;
  const map = (v: number) => pad + ((v + 1) / 2) * (size - 2 * pad);
  const trail = points.slice(0, frame + 1).filter((p): p is { x: number; y: number } => !!p);
  const path = trail
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${map(p.x).toFixed(1)} ${(size - map(p.y)).toFixed(1)}`)
    .join(' ');
  const head = trail[trail.length - 1];

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="relative rounded-md bg-muted/40 border" style={{ aspectRatio: '1 / 1' }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {/* Foot outline (rounded rectangle as a simplified foot) */}
          <rect x={pad - 2} y={pad - 2} width={size - 2 * (pad - 2)} height={size - 2 * (pad - 2)} rx={28}
            fill="hsl(var(--background))" stroke="hsl(var(--border))" />
          {/* Quadrant guides */}
          <line x1={size / 2} y1={pad} x2={size / 2} y2={size - pad} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <line x1={pad} y1={size / 2} x2={size - pad} y2={size / 2} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <defs>
            <linearGradient id={`g-${label}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
          <motion.path
            d={path}
            fill="none"
            stroke={`url(#g-${label})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {head && (
            <circle cx={map(head.x)} cy={size - map(head.y)} r={5} fill={colorTo} stroke="hsl(var(--background))" strokeWidth={2} />
          )}
          {/* Labels */}
          <text x={size / 2} y={pad - 2} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">Toe</text>
          <text x={size / 2} y={size - 2} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">Heel</text>
          <text x={pad - 4} y={size / 2} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">M</text>
          <text x={size - pad + 4} y={size / 2} textAnchor="start" fontSize="8" fill="hsl(var(--muted-foreground))">L</text>
        </svg>
      </div>
    </div>
  );
};
