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
    <div className="card-premium card-glow rounded-3xl overflow-hidden border-0 relative animate-fade-in">
      {/* Image */}
      <div className="relative h-[220px] sm:h-[260px] overflow-hidden">
        <img
          src={visual.image}
          alt={visual.title}
          loading="lazy"
          className="img-cinematic absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark luxury gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222_50%_5%/0.96)] via-[hsl(222_45%_8%/0.55)] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222_50%_5%/0.65)] via-transparent to-transparent" />
        {/* Sheen overlay */}
        <div className="sheen absolute inset-0 overflow-hidden" />

        {/* Top row: AI badge + tag */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(222_50%_5%/0.65)] backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/40">
            <Sparkles className="h-3 w-3" />
            AI Matched
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 bg-[hsl(222_50%_5%/0.55)] backdrop-blur px-2.5 py-1 rounded-full ring-1 ring-white/10 truncate max-w-[55%]">
            {visual.tag}
          </span>
        </div>

        {/* Bottom title block over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--accent))] font-bold">
            Next Session
          </div>
          <h3 className="text-[clamp(1.4rem,5vw,1.85rem)] font-bold leading-tight mt-1 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
            {visual.title}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {visual.blurb}
        </p>

        {(current || goal) && (
          <div className="grid grid-cols-2 gap-2.5">
            {current && (
              <MetricPill label={current.label || 'Current'} value={current.value} tone="current" />
            )}
            {goal && (
              <MetricPill label={goal.label || 'Goal'} value={goal.value} tone="goal" />
            )}
          </div>
        )}

        <button
          onClick={onCta}
          className={cn(
            'group w-full rounded-2xl bg-primary text-primary-foreground py-3.5 px-4',
            'font-semibold text-sm flex items-center justify-center gap-2',
            'transition-all active:scale-[0.98]',
            'shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.7)]',
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
    'rounded-2xl px-3 py-2.5 ring-1 flex flex-col gap-0.5',
    tone === 'current'
      ? 'bg-[hsl(var(--accent)/0.08)] ring-[hsl(var(--accent)/0.25)]'
      : 'bg-primary/8 ring-primary/30',
  )}>
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
      <Target className="h-3 w-3" />
      {label}
    </div>
    <div className={cn(
      'text-lg font-bold num leading-tight',
      tone === 'current' ? 'text-[hsl(var(--accent))]' : 'text-primary',
    )}>
      {value}
    </div>
  </div>
);
