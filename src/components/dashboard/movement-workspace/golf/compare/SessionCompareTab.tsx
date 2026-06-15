import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { GolfDatabasePicker } from '../database/GolfDatabasePicker';
import { useGolfHydration } from '../useGolfHydration';
import { GolfForceTraceChart } from '../GolfForceTraceChart';
import { computeGolfKpis, type GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';
import { deriveGolfInsights } from '@/lib/movement-engine/modules/golf/insights';
import { useState } from 'react';

const KPI_LABELS: Array<[keyof GolfKpis, string, string]> = [
  ['lead_load_pct', 'Lead Load', '%'],
  ['trail_load_pct', 'Trail Load', '%'],
  ['weight_transfer_pct', 'Weight Transfer', '%'],
  ['tempo_ratio', 'Tempo Ratio', ''],
  ['transition_ms', 'Transition', 'ms'],
  ['peak_force', 'Peak Force', 'N'],
  ['cop_efficiency', 'CoP Efficiency', ''],
];

function avg(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

function deltaPill(delta: number, betterIfHigher: boolean) {
  const eps = 0.5;
  if (Math.abs(delta) < eps) return { label: 'Unchanged', cls: 'bg-slate-700/40 text-slate-300 border-slate-600' };
  const improved = betterIfHigher ? delta > 0 : delta < 0;
  return improved
    ? { label: `Improved ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
    : { label: `Worsened ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`, cls: 'bg-red-500/20 text-red-300 border-red-500/40' };
}

const BETTER_IF_HIGHER: Record<keyof GolfKpis, boolean> = {
  peak_force: true,
  lead_load_pct: true,
  trail_load_pct: false,
  weight_transfer_pct: true,
  tempo_ratio: true,
  cop_quality: true,
  transition_ms: false,
  peak_impact_force: true,
  cop_efficiency: true,
};

export function SessionCompareTab() {
  const [idA, setIdA] = useState<string>();
  const [idB, setIdB] = useState<string>();
  const A = useGolfHydration(idA);
  const B = useGolfHydration(idB);

  const kpisA = useMemo<GolfKpis | null>(() => {
    if (!A.data?.session || !A.data.events.length) return null;
    const list = A.data.events.map((e) => computeGolfKpis(e, A.data!.session!));
    return averageKpis(list);
  }, [A.data]);
  const kpisB = useMemo<GolfKpis | null>(() => {
    if (!B.data?.session || !B.data.events.length) return null;
    const list = B.data.events.map((e) => computeGolfKpis(e, B.data!.session!));
    return averageKpis(list);
  }, [B.data]);

  const findingsDiff = useMemo(() => {
    if (!A.data || !B.data) return null;
    const fa = A.data.session ? deriveGolfInsights(A.data.events.map((e) => computeGolfKpis(e, A.data!.session!))) : null;
    const fb = B.data.session ? deriveGolfInsights(B.data.events.map((e) => computeGolfKpis(e, B.data!.session!))) : null;
    if (!fa || !fb) return null;
    const labelsA = new Set(fa.technical.map((t: any) => t.label));
    const labelsB = new Set(fb.technical.map((t: any) => t.label));
    const resolved = [...labelsA].filter((l) => !labelsB.has(l));
    const created = [...labelsB].filter((l) => !labelsA.has(l));
    const kept = [...labelsA].filter((l) => labelsB.has(l));
    return { resolved, created, kept };
  }, [A.data, B.data]);

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        {idA ? (
          <Card className="p-3 bg-slate-950 border-amber-500/30 text-slate-100">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Session A</Badge>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIdA(undefined)}>Change</Button>
            </div>
            {A.isLoading ? <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/>Loading…</div> :
              <div className="text-xs text-slate-300">{A.data?.athleteName} · {A.data?.testDate}</div>}
          </Card>
        ) : <GolfDatabasePicker title="Session A" onSelect={(id) => setIdA(id)} />}

        {idB ? (
          <Card className="p-3 bg-slate-950 border-cyan-500/30 text-slate-100">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">Session B</Badge>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIdB(undefined)}>Change</Button>
            </div>
            {B.isLoading ? <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/>Loading…</div> :
              <div className="text-xs text-slate-300">{B.data?.athleteName} · {B.data?.testDate}</div>}
          </Card>
        ) : <GolfDatabasePicker title="Session B" onSelect={(id) => setIdB(id)} />}
      </div>

      {kpisA && kpisB && (
        <Card className="p-4 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs uppercase tracking-widest text-slate-300">KPI Deltas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left py-1">Metric</th>
                  <th className="text-right">A</th>
                  <th className="text-right">B</th>
                  <th className="text-right">Δ</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {KPI_LABELS.map(([k, label, unit]) => {
                  const a = kpisA[k] as number;
                  const b = kpisB[k] as number;
                  const d = b - a;
                  const pill = deltaPill(d, BETTER_IF_HIGHER[k]);
                  return (
                    <tr key={k} className="border-t border-slate-800">
                      <td className="py-1.5 text-slate-300">{label}</td>
                      <td className="text-right font-mono text-amber-300">{a.toFixed(1)}{unit}</td>
                      <td className="text-right font-mono text-cyan-300">{b.toFixed(1)}{unit}</td>
                      <td className="text-right font-mono text-slate-400">{d >= 0 ? '+' : ''}{d.toFixed(1)}</td>
                      <td className="text-right"><span className={`text-[10px] px-2 py-0.5 rounded-full border ${pill.cls}`}>{pill.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {A.data?.session && B.data?.session && (
        <Card className="p-3 bg-slate-950 border-slate-800">
          <h3 className="text-xs uppercase tracking-widest text-slate-300 mb-2">Force Trace Overlay (impact-aligned)</h3>
          <CompareOverlay a={A.data} b={B.data} />
        </Card>
      )}

      {findingsDiff && (
        <Card className="p-4 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
          <h3 className="text-xs uppercase tracking-widest text-slate-300">Findings Diff</h3>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <FindingsCol title="Resolved" tone="emerald" items={findingsDiff.resolved} />
            <FindingsCol title="New" tone="red" items={findingsDiff.created} />
            <FindingsCol title="Unchanged" tone="slate" items={findingsDiff.kept} />
          </div>
        </Card>
      )}
    </div>
  );
}

function CompareOverlay({ a, b }: { a: any; b: any }) {
  // Build an inline overlay by merging a and b sessions into one synthetic session
  // (simple visual: render A and B back-to-back charts vertically for clarity).
  return (
    <div className="grid md:grid-cols-2 gap-2">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-1">Session A · best swing</div>
        <GolfForceTraceChart session={a.session} events={a.events} selectedIndex={1} height={220} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-1">Session B · best swing</div>
        <GolfForceTraceChart session={b.session} events={b.events} selectedIndex={1} height={220} />
      </div>
    </div>
  );
}

function FindingsCol({ title, tone, items }: { title: string; tone: 'emerald' | 'red' | 'slate'; items: string[] }) {
  const ring = tone === 'emerald' ? 'border-emerald-500/40 text-emerald-300' : tone === 'red' ? 'border-red-500/40 text-red-300' : 'border-slate-600 text-slate-300';
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-widest mb-1 ${ring.split(' ')[1]}`}>{title} ({items.length})</div>
      {items.length === 0 ? <p className="text-slate-500 text-[11px]">—</p> :
        <ul className="space-y-1">
          {items.map((l) => <li key={l} className={`px-2 py-1 rounded border ${ring} bg-slate-900/60`}>{l}</li>)}
        </ul>}
    </div>
  );
}

function averageKpis(list: GolfKpis[]): GolfKpis {
  const keys = Object.keys(list[0]) as (keyof GolfKpis)[];
  const out: any = {};
  keys.forEach((k) => { out[k] = avg(list.map((x) => x[k] as number)); });
  return out as GolfKpis;
}
