import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import type { GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';
import { scoreGolfKpis } from '@/lib/movement-engine/modules/golf/kpis';

interface Props {
  kpis:         GolfKpis;
  swingCount:   number;
  bestScore:    number;
  consistency:  number;
}

// Traffic light thresholds from the v10 algorithm spec
const GOOD  = '#22c55e'; // ≥ 80
const WARN  = '#f59e0b'; // ≥ 58
const POOR  = '#ef4444'; // < 58

function tl(score: number): string {
  if (score >= 80) return GOOD;
  if (score >= 58) return WARN;
  return POOR;
}

function tlLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 58) return 'Developing';
  return 'Needs work';
}

// Animated SVG score ring
function ScoreRing({
  score,
  label,
  raw,
  delay = 0,
}: {
  score:  number;
  label:  string;
  raw?:   string;
  delay?: number;
}) {
  const r     = 36;
  const color = tl(score);
  const badge = tlLabel(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Ring */}
      <div className="relative w-24 h-24">
        {/* Rotate the whole SVG so progress starts from 12 o'clock */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth="9"
          />
          {/* Animated progress arc */}
          <motion.circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: score / 100 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: delay + 0.1 }}
          />
        </svg>

        {/* Score text — overlaid, NOT rotated */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-xl font-bold font-mono leading-none tabular-nums"
            style={{ color }}
          >
            {score}
          </span>
          <span className="text-[9px] text-slate-500 mt-0.5">/100</span>
        </div>
      </div>

      {/* Label + raw value */}
      <div className="text-center max-w-[88px]">
        <div className="text-[11px] font-semibold text-slate-200 leading-tight">{label}</div>
        {raw && <div className="text-[10px] text-slate-500 mt-0.5">{raw}</div>}
        <div
          className="text-[9px] font-medium mt-0.5 uppercase tracking-wider"
          style={{ color }}
        >
          {badge}
        </div>
      </div>
    </motion.div>
  );
}

// Small flat info card for non-scored values
function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">{label}</div>
      <div className="text-base font-mono font-bold text-cyan-300 tabular-nums">{value}</div>
    </div>
  );
}

const fmt = (n: number, dp = 0) => (Number.isFinite(n) && n > 0 ? n.toFixed(dp) : '—');

export function GolfKpiStrip({ kpis, swingCount, bestScore, consistency }: Props) {
  const scores = scoreGolfKpis(kpis);

  const rings = [
    { score: scores.lead_load,       label: 'Lead Load',        raw: `${fmt(kpis.lead_load_pct)}%` },
    { score: scores.weight_transfer, label: 'Weight Transfer',  raw: `${fmt(kpis.weight_transfer_pct)}%` },
    { score: scores.tempo,           label: 'Tempo',            raw: fmt(kpis.tempo_ratio, 2) },
    { score: scores.transition,      label: 'Transition',       raw: kpis.transition_ms > 0 ? `${fmt(kpis.transition_ms)} ms` : '—' },
    { score: scores.cop_quality,     label: 'CoP Quality',      raw: `${fmt(kpis.cop_efficiency)}%` },
    { score: consistency,            label: 'Consistency',      raw: `${swingCount} swing${swingCount !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="space-y-3">
      {/* Score rings row */}
      <Card className="bg-slate-950 border-slate-800 p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 justify-items-center">
          {rings.map((r, i) => (
            <ScoreRing key={r.label} {...r} delay={i * 0.06} />
          ))}
        </div>
      </Card>

      {/* Raw values strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <InfoChip label="Peak Force"   value={kpis.peak_force > 0 ? `${fmt(kpis.peak_force)} N` : '—'} />
        <InfoChip label="Trail Load"   value={kpis.trail_load_pct > 0 ? `${fmt(kpis.trail_load_pct)}%` : '—'} />
        <InfoChip label="Best Score"   value={bestScore > 0 ? String(bestScore) : '—'} />
        <InfoChip label="Swings"       value={String(swingCount)} />
      </div>
    </div>
  );
}
