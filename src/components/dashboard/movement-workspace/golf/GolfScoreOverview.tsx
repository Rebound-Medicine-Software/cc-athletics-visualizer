/**
 * GolfScoreOverview — athlete-facing summary card.
 * Shows the overall session score as a large animated ring,
 * a plain-English headline, and the top narrative Q&A items.
 */
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import type { GolfNarrative } from '@/lib/movement-engine/modules/golf/insights';

interface Props {
  narrative: GolfNarrative;
}

const GOOD  = '#22c55e';
const WARN  = '#f59e0b';
const POOR  = '#ef4444';

function overallColor(score: number) {
  if (score >= 80) return GOOD;
  if (score >= 58) return WARN;
  return POOR;
}

function OverallRing({ score }: { score: number }) {
  const r     = 56;
  const color = overallColor(score);
  const label =
    score >= 80 ? 'Excellent' :
    score >= 58 ? 'Developing' :
    'Needs Work';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90" aria-hidden="true">
          {/* Track glow */}
          <circle cx="72" cy="72" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
          {/* Animated ring */}
          <motion.circle
            cx="72" cy="72" r={r}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: score / 100 }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>

        {/* Score text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold font-mono tabular-nums leading-none"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {score}
          </motion.span>
          <span className="text-slate-500 text-xs mt-1">/100</span>
        </div>
      </div>

      {/* Traffic-light badge */}
      <div
        className="px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border"
        style={{ color, borderColor: `${color}50`, background: `${color}12` }}
      >
        {label}
      </div>
    </div>
  );
}

export function GolfScoreOverview({ narrative }: Props) {
  if (!narrative.items.length && !narrative.overall) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
          {/* Left: big ring */}
          <div className="flex-shrink-0 w-full lg:w-auto flex justify-center">
            <OverallRing score={narrative.overall} />
          </div>

          {/* Right: headline + Q&A */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Headline */}
            <p className="text-base text-slate-100 font-medium leading-relaxed">
              {narrative.headline}
            </p>

            {/* Narrative items */}
            <div className="space-y-3">
              {narrative.items.slice(0, 3).map((item, i) => (
                <motion.div
                  key={item.question}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="text-sm font-semibold text-slate-100">{item.question}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed pl-7">
                    {item.answer}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
