import { Sparkles, ArrowRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionVisual } from './sessionVisuals';

interface Props {
  visual: SessionVisual;
  ctaLabel?: string;
  onCta?: () => void;
  current?: { label: string; value: string } | null;
  goal?: { label: string; value: string } | null;
}

export const AIMatchedSessionCard = ({
  visual,
  ctaLabel = 'Start Session',
  onCta,
  current,
  goal,
}: Props) => {
  return (
    <div className="card-premium rounded-[30px] overflow-hidden border-0 relative animate-fade-in">
      {/* Image — cinematic crop */}
      <div className="relative h-[240px] sm:h-[280px] overflow-hidden">
        <img
          src={visual.image}
          alt={visual.title}
          loading="lazy"
          className="img-cinematic absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'saturate(0.92) contrast(1.08) brightness(0.72)', transform: 'scale(1.02)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 72% 18%, hsl(42 65% 56% / 0.28), transparent 30%),' +
              'linear-gradient(180deg, hsl(210 45% 4% / 0.05) 0%, hsl(210 50% 5% / 0.85) 100%)',
          }}
        />
        <div className="sheen absolute inset-0 overflow-hidden pointer-events-none" />

        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(210_45%_4%/0.6)] backdrop-blur-md px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/35 shadow-[0_8px_22px_rgba(0,0,0,0.3)]">
            <Sparkles className="h-3 w-3" />
            AI Matched
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[hsl(42_70%_72%)] bg-[hsl(42_65%_56%/0.14)] backdrop-blur-md px-3 py-1.5 rounded-full ring-1 ring-[hsl(42_65%_56%/0.28)] truncate max-w-[55%] shadow-[0_8px_22px_rgba(0,0,0,0.3)]">
            {visual.tag}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--athlete-cyan))] font-extrabold">
            Next Session
          </div>
          <h3 className="text-[26px] font-extrabold leading-[1.05] tracking-[-0.04em] mt-1.5 text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)]">
            {visual.title}
          </h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-[13px] text-muted-foreground leading-[1.55]">
          {visual.blurb}
        </p>

        {(current || goal) && (
          <div className="grid grid-cols-2 gap-2.5">
            {current && <MetricPill label={current.label || 'Current'} value={current.value} tone="current" />}
            {goal && <MetricPill label={goal.label || 'Goal'} value={goal.value} tone="goal" />}
          </div>
        )}

        <button
          onClick={onCta}
          className={cn(
            'group w-full rounded-2xl py-3.5 px-4',
            'font-extrabold text-sm flex items-center justify-center gap-2',
            'transition-all active:scale-[0.97]',
            'bg-gradient-to-br from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))] text-[hsl(210_50%_5%)]',
            'shadow-[0_14px_36px_-12px_hsl(var(--athlete-green)/0.55)]',
          )}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

const MetricPill = ({
  label, value, tone,
}: { label: string; value: string; tone: 'current' | 'goal' }) => (
  <div className={cn(
    'rounded-2xl px-3.5 py-3 ring-1 flex flex-col gap-1',
    tone === 'current'
      ? 'bg-[hsl(var(--accent)/0.08)] ring-[hsl(var(--accent)/0.22)]'
      : 'bg-primary/10 ring-primary/30',
  )}>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-bold text-muted-foreground">
      <Target className="h-3 w-3" />
      {label}
    </div>
    <div className={cn(
      'text-[18px] num leading-none',
      tone === 'current' ? 'text-[hsl(var(--accent))]' : 'text-primary',
    )}>
      {value}
    </div>
  </div>
);
