import { Card } from '@/components/ui/card';
import { GOLF_TARGET_BANDS, GOLF_BENCHMARK_SCOPES, type BenchmarkScope } from '@/lib/movement-engine/modules/golf/benchmarks';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import type { GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';

const LABELS: Record<string, string> = {
  lead_load_pct:       'Lead Load %',
  weight_transfer_pct: 'Weight Transfer Δ',
  tempo_ratio:         'Tempo Ratio',
  cop_efficiency:      'CoP Efficiency',
  peak_impact_force:   'Peak Impact Force (N)',
  transition_ms:       'Transition (ms)',
};

export function GolfBenchmarkPanel({ kpis }: { kpis: GolfKpis }) {
  const [scope, setScope] = useState<BenchmarkScope>('golf_benchmark');

  return (
    <Card className="p-4 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs uppercase tracking-widest text-slate-400">Benchmarks</h3>
        <div className="flex flex-wrap gap-1">
          {GOLF_BENCHMARK_SCOPES.map((s) => (
            <button
              key={s.id}
              disabled={s.disabled}
              onClick={() => setScope(s.id)}
              className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border
                ${s.disabled ? 'border-slate-800 text-slate-600 cursor-not-allowed' :
                  scope === s.id ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                                 : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {s.label}{s.disabled ? ' (soon)' : ''}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(GOLF_TARGET_BANDS).map(([key, band]) => {
          const value = (kpis as any)[key] ?? 0;
          const inGood = value >= band.good[0] && value <= band.good[1];
          const inOk = !inGood && value >= band.ok[0] && value <= band.ok[1];
          const status = inGood ? 'good' : inOk ? 'ok' : 'low';
          const pct = clamp(((value - band.ok[0]) / (band.ok[1] - band.ok[0])) * 100, 0, 100);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{LABELS[key]}</span>
                <span className="font-mono text-slate-100">{value}
                  <Badge variant="outline" className={`ml-2 text-[9px] uppercase
                    ${status === 'good' ? 'border-emerald-500 text-emerald-400'
                     : status === 'ok' ? 'border-amber-500 text-amber-400'
                     : 'border-red-500 text-red-400'}`}>
                    {status === 'good' ? 'in band' : status === 'ok' ? 'near' : 'off'}
                  </Badge>
                </span>
              </div>
              <div className="relative h-1.5 rounded bg-slate-800 overflow-hidden">
                <div className="absolute inset-y-0 bg-emerald-500/60"
                  style={{ left: `${pctOf(band.good[0], band.ok)}%`, width: `${pctOf(band.good[1], band.ok) - pctOf(band.good[0], band.ok)}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-amber-400" style={{ left: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{band.ok[0]}</span><span>{band.ok[1]}</span>
              </div>
            </div>
          );
        })}
      </div>
      {scope !== 'golf_benchmark' && (
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-800">
          Insufficient {scope} data — showing target bands only.
        </p>
      )}
    </Card>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pctOf = (v: number, range: [number, number]) =>
  clamp(((v - range[0]) / (range[1] - range[0])) * 100, 0, 100);
