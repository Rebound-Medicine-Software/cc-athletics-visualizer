import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, X, Sparkles, Trophy, Target, TrendingUp,
  Flame, Compass, Award, Activity,
} from 'lucide-react';
import { tierStyles, type MetricInterpretation } from '@/utils/metricInterpretation';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';
import { motionEase, useReducedMotionVariants } from '@/lib/motion';

export interface InterpretedSnapshot {
  spec: { testName: string; metricKey: string; label: string };
  interpretation: MetricInterpretation;
  changePct: number | null;
  isImprovement: boolean | null;
  baselineDisplay: string | null;
  latestDisplay: string | null;
}

export interface PresentationRanking {
  label: string;
  scopeLabel: string;
  rank: number | null;
  totalAthletes: number;
  percentile: number | null;
}

interface Props {
  athleteName: string;
  snapshots: InterpretedSnapshot[];
  athleteSports?: string[] | null;
  rankings?: PresentationRanking[];
  onClose: () => void;
}

/**
 * Soften clinical wording for athlete-facing presentation.
 * Keeps interpretation semantics, but reframes "needs focus" → "Big opportunity".
 */
const tonedRating = (rating: string, tier: MetricInterpretation['tier']) => {
  if (tier === 'needs_focus') return 'Big opportunity';
  if (tier === 'developing') return 'Developing';
  return rating;
};

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40, scale: 0.985 }),
  center: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.42, ease: motionEase.emphasized } },
  exit: (dir: number) => ({
    opacity: 0, x: dir > 0 ? -40 : 40, scale: 0.985,
    transition: { duration: 0.28, ease: motionEase.exit },
  }),
};

/**
 * Premium full-screen "Present Results" mode (C5.5).
 *
 * Slide pacing — one idea per slide:
 *   1. Welcome
 *   2. What's going well (overview)
 *   3. Areas to improve (overview)
 *   4..N. Per-metric story (Jump Power, Strength, etc.)
 *   N+1. How you compare (anonymised rank)
 *   N+2. Progress since last test
 *   N+3. Next focus
 *   N+4. What happens next
 */
export const PresentationMode = ({ athleteName, snapshots, athleteSports, rankings, onClose }: Props) => {
  const sportContext = sportComparisonLabel(athleteSports, '');
  const compareRankings = (rankings ?? []).filter((r) => r.rank != null);
  const showCompare = compareRankings.length > 0;

  const goingWell = useMemo(
    () => snapshots.filter((s) => s.interpretation.tier === 'excellent' || s.interpretation.tier === 'good'),
    [snapshots],
  );
  const focusAreas = useMemo(
    () => snapshots.filter((s) => s.interpretation.tier === 'needs_focus' || s.interpretation.tier === 'developing'),
    [snapshots],
  );
  const progress = useMemo(
    () => snapshots.filter((s) => s.changePct != null && s.baselineDisplay && s.latestDisplay),
    [snapshots],
  );
  const showProgress = progress.length > 0;

  // Build slide deck
  type Slide =
    | { kind: 'welcome' }
    | { kind: 'overview-wins' }
    | { kind: 'overview-focus' }
    | { kind: 'metric'; data: InterpretedSnapshot }
    | { kind: 'compare' }
    | { kind: 'progress' }
    | { kind: 'next-focus' }
    | { kind: 'wrap' };

  const slides: Slide[] = useMemo(() => {
    const arr: Slide[] = [{ kind: 'welcome' }];
    if (goingWell.length) arr.push({ kind: 'overview-wins' });
    if (focusAreas.length) arr.push({ kind: 'overview-focus' });
    snapshots.forEach((s) => arr.push({ kind: 'metric', data: s }));
    if (showCompare) arr.push({ kind: 'compare' });
    if (showProgress) arr.push({ kind: 'progress' });
    if (focusAreas.length || snapshots.length) arr.push({ kind: 'next-focus' });
    arr.push({ kind: 'wrap' });
    return arr;
  }, [snapshots, goingWell.length, focusAreas.length, showCompare, showProgress]);

  const totalSlides = slides.length;
  const [[idx, dir], setIdxDir] = useState<[number, number]>([0, 0]);
  const setIdx = (next: number) => setIdxDir(([prev]) => [Math.max(0, Math.min(totalSlides - 1, next)), next > prev ? 1 : -1]);

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const variants = useReducedMotionVariants(slideVariants as any);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') setIdx(idx + 1);
      if (e.key === 'ArrowLeft') setIdx(idx - 1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, idx, totalSlides]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const d = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(d) < 60) return;
    if (d < 0) setIdx(idx + 1); else setIdx(idx - 1);
  };

  const renderSlide = (slide: Slide) => {
    switch (slide.kind) {
      case 'welcome':
        return (
          <div className="text-center max-w-3xl px-4 sm:px-6">
            <div className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
              Your Performance Story
            </div>
            <h1 className="text-[clamp(2.5rem,9vw,6rem)] font-bold tracking-tight leading-[1.05]">
              Hey {athleteName.split(' ')[0]}.
            </h1>
            <p className="text-lg sm:text-2xl text-muted-foreground mt-6 sm:mt-8 leading-relaxed">
              Let's walk through where you are — and what comes next.
            </p>
            {sportContext && (
              <Badge variant="outline" className="mt-8 text-sm px-4 py-1.5 rounded-full">
                <Compass className="h-3.5 w-3.5 mr-1.5" /> {sportContext}
              </Badge>
            )}
          </div>
        );

      case 'overview-wins':
        return (
          <div className="max-w-3xl px-4 sm:px-6 w-full">
            <div className="flex items-center justify-center gap-2 text-emerald-600 mb-6">
              <Trophy className="h-6 w-6" />
              <span className="text-xs uppercase tracking-[0.25em]">What's going well</span>
            </div>
            <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-tight text-center leading-tight">
              Your wins
            </h2>
            <div className="mt-10 space-y-3">
              {goingWell.slice(0, 4).map((g) => (
                <div key={g.spec.label} className="rounded-2xl border bg-card/40 p-5 sm:p-6 backdrop-blur">
                  <div className="text-base sm:text-lg font-semibold">{g.interpretation.title}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-1">{g.interpretation.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'overview-focus':
        return (
          <div className="max-w-3xl px-4 sm:px-6 w-full">
            <div className="flex items-center justify-center gap-2 text-amber-600 mb-6">
              <Target className="h-6 w-6" />
              <span className="text-xs uppercase tracking-[0.25em]">Areas to improve</span>
            </div>
            <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-tight text-center leading-tight">
              Big opportunities
            </h2>
            <div className="mt-10 space-y-3">
              {focusAreas.slice(0, 4).map((f) => (
                <div key={f.spec.label} className="rounded-2xl border bg-card/40 p-5 sm:p-6 backdrop-blur">
                  <div className="text-base sm:text-lg font-semibold">{f.interpretation.title}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-1">{f.interpretation.focusSuggestion}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'metric': {
        const snap = slide.data;
        const styles = tierStyles[snap.interpretation.tier];
        return (
          <div className="text-center max-w-3xl px-4 sm:px-6">
            <div className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
              {snap.interpretation.category}
            </div>
            <h2 className="text-[clamp(2.5rem,9vw,6rem)] font-bold tracking-tight leading-[1.02]">
              {snap.interpretation.title}
            </h2>
            {snap.latestDisplay && (
              <div className="text-[clamp(2rem,6vw,3.5rem)] font-semibold mt-6 tabular-nums text-primary">
                {snap.latestDisplay}
              </div>
            )}
            <div className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mt-5 ${styles.badge}`}>
              {tonedRating(snap.interpretation.ratingLabel, snap.interpretation.tier)}
            </div>
            <p className="text-lg sm:text-2xl mt-8 sm:mt-10 leading-relaxed text-foreground/90">
              {snap.interpretation.explanation}
            </p>
            {snap.changePct != null && (
              <div className="mt-8 inline-flex items-center gap-2 text-base sm:text-lg">
                {snap.isImprovement ? (
                  <Flame className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Activity className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={snap.isImprovement ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                  {snap.changePct > 0 ? '+' : ''}{snap.changePct.toFixed(1)}% since last test
                </span>
              </div>
            )}
          </div>
        );
      }

      case 'compare':
        return (
          <div className="max-w-3xl px-4 sm:px-6 w-full">
            <div className="flex items-center justify-center gap-2 text-primary mb-6">
              <Award className="h-6 w-6" />
              <span className="text-xs uppercase tracking-[0.25em]">How you compare</span>
            </div>
            <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-tight text-center leading-tight">
              Where you stand
            </h2>
            {sportContext && (
              <p className="text-center text-sm sm:text-base text-muted-foreground mt-3">{sportContext}</p>
            )}
            <div className="mt-10 space-y-3">
              {compareRankings.slice(0, 4).map((r) => {
                const pct = r.percentile;
                const headline =
                  pct != null
                    ? pct <= 10 ? `Top ${pct}% in ${r.scopeLabel}`
                    : pct <= 50 ? `Top ${pct}% in ${r.scopeLabel}`
                    : `Above ${100 - pct}% in ${r.scopeLabel}`
                    : `#${r.rank} in ${r.scopeLabel}`;
                const elite = pct != null && pct <= 10;
                return (
                  <div
                    key={r.label}
                    className={`rounded-2xl border p-5 sm:p-6 flex items-center justify-between gap-4 backdrop-blur ${
                      elite ? 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/40' : 'bg-card/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-semibold truncate">{r.label}</div>
                      <div className="text-sm sm:text-base text-muted-foreground mt-0.5">{headline}</div>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="text-2xl sm:text-3xl font-bold">#{r.rank}</div>
                      <div className="text-[11px] sm:text-xs text-muted-foreground">of {r.totalAthletes}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-6">
              Anonymised — we never show other athletes' names.
            </p>
          </div>
        );

      case 'progress':
        return (
          <div className="max-w-3xl px-4 sm:px-6 w-full">
            <div className="flex items-center justify-center gap-2 text-primary mb-6">
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs uppercase tracking-[0.25em]">Since last test</span>
            </div>
            <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-tight text-center leading-tight">
              Your progress
            </h2>
            <div className="mt-10 space-y-3">
              {progress.slice(0, 5).map((p) => (
                <div key={p.spec.label} className="rounded-2xl border bg-card/40 p-5 sm:p-6 flex items-center justify-between gap-4 backdrop-blur">
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold truncate">{p.interpretation.title}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 tabular-nums">
                      {p.baselineDisplay} → <span className="text-foreground font-medium">{p.latestDisplay}</span>
                    </div>
                  </div>
                  <div className={`text-lg sm:text-xl font-bold tabular-nums shrink-0 ${
                    p.isImprovement ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}>
                    {p.changePct! > 0 ? '+' : ''}{p.changePct!.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'next-focus':
        return (
          <div className="max-w-3xl px-4 sm:px-6 w-full">
            <div className="flex items-center justify-center gap-2 text-primary mb-6">
              <Target className="h-6 w-6" />
              <span className="text-xs uppercase tracking-[0.25em]">Coach recommendation</span>
            </div>
            <h2 className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-tight text-center leading-tight">
              Where to put your energy
            </h2>
            <div className="mt-10 space-y-3">
              {(focusAreas.length ? focusAreas : snapshots.slice(0, 3)).slice(0, 3).map((f) => (
                <div key={f.spec.label} className="rounded-2xl border bg-card/40 p-5 sm:p-6 backdrop-blur">
                  <div className="text-base sm:text-lg font-semibold">{f.interpretation.title}</div>
                  <div className="text-sm sm:text-base text-muted-foreground mt-1.5">
                    {f.interpretation.focusSuggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'wrap':
        return (
          <div className="text-center max-w-2xl px-4 sm:px-6">
            <div className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
              What happens next
            </div>
            <h2 className="text-[clamp(2.5rem,8vw,5rem)] font-bold tracking-tight leading-[1.05]">
              Let's get to work.
            </h2>
            <p className="text-lg sm:text-2xl text-muted-foreground mt-6 sm:mt-8 leading-relaxed">
              Your programme is tailored to these focus areas.
              Stay consistent, log your sessions, and we'll retest soon.
            </p>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-primary/5 border-primary/30 text-primary">
              <Sparkles className="h-4 w-4" /> Keep showing up.
            </div>
          </div>
        );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] bg-gradient-to-br from-background via-background to-muted/30 flex flex-col h-[100dvh] overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Top progress bar */}
      <div className="h-1 bg-muted/40 shrink-0">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${((idx + 1) / totalSlides) * 100}%` }}
          transition={{ duration: 0.4, ease: motionEase.emphasized }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground tabular-nums">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline tracking-[0.2em] uppercase">Presentation</span>
          <span>{idx + 1} / {totalSlides}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 h-10 px-3 rounded-full">
          <X className="h-4 w-4" /> Exit
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-y-auto overflow-x-hidden py-4 sm:py-8">
        <AnimatePresence custom={dir} mode="wait" initial={false}>
          <motion.div
            key={idx}
            custom={dir}
            variants={variants as any}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full flex items-center justify-center"
          >
            {renderSlide(slides[idx])}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
        <Button
          variant="ghost"
          size="lg"
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
          className="gap-2 h-12 min-w-[3rem] sm:min-w-[5rem] rounded-full"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[55%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-8 bg-primary' : i < idx ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted-foreground/25'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <Button
          size="lg"
          disabled={idx === totalSlides - 1}
          onClick={() => setIdx(idx + 1)}
          className="gap-2 h-12 min-w-[3rem] sm:min-w-[5rem] rounded-full"
          aria-label="Next slide"
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>,
    document.body,
  );
};
