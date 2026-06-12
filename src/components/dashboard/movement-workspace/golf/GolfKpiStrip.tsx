import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import type { GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';

interface Props { kpis: GolfKpis; swingCount: number; bestScore: number; consistency: number; }

const fmt = (n: number, dp = 0) => (Number.isFinite(n) ? n.toFixed(dp) : '—');

export function GolfKpiStrip({ kpis, swingCount, bestScore, consistency }: Props) {
  const cells = [
    { label: 'Detected Swings',  value: String(swingCount),                 accent: 'cyan'   },
    { label: 'Best Swing Score', value: `${bestScore}`,                      accent: 'gold'   },
    { label: 'Peak Force (N)',   value: fmt(kpis.peak_force),               accent: 'cyan'   },
    { label: 'Lead Load %',      value: `${fmt(kpis.lead_load_pct)}%`,      accent: 'cyan'   },
    { label: 'Trail Load %',     value: `${fmt(kpis.trail_load_pct)}%`,     accent: 'cyan'   },
    { label: 'Weight Transfer',  value: `${fmt(kpis.weight_transfer_pct)}%`,accent: 'gold'   },
    { label: 'Tempo Ratio',      value: fmt(kpis.tempo_ratio, 2),           accent: 'cyan'   },
    { label: 'Consistency',      value: `${consistency}`,                    accent: 'gold'   },
    { label: 'CoP Quality',      value: `${fmt(kpis.cop_efficiency)}%`,     accent: 'cyan'   },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
      {cells.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          <Card className="relative overflow-hidden p-3 bg-slate-950 text-slate-100 border-slate-800">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">{c.label}</div>
            <div className={`mt-1 text-2xl font-mono tabular-nums ${c.accent === 'gold' ? 'text-amber-400' : 'text-cyan-300'}`}>
              {c.value}
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-0.5 ${c.accent === 'gold' ? 'bg-amber-400/60' : 'bg-cyan-400/60'}`} />
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
