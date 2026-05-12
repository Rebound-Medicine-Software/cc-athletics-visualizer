import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, X, Sparkles, Trophy, Target } from 'lucide-react';
import { tierStyles, type MetricInterpretation } from '@/utils/metricInterpretation';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';

export interface InterpretedSnapshot {
  spec: { testName: string; metricKey: string; label: string };
  interpretation: MetricInterpretation;
  changePct: number | null;
  isImprovement: boolean | null;
  baselineDisplay: string | null;
  latestDisplay: string | null;
}

export interface PresentationRanking {
  label: string;       // e.g. "CMJ Jump Height"
  scopeLabel: string;  // e.g. "your club (MMA Gym)"
  rank: number | null;
  totalAthletes: number;
  percentile: number | null; // 1..100, lower = better
}

interface Props {
  athleteName: string;
  snapshots: InterpretedSnapshot[];
  /** Optional sports tags to ground the comparison context. */
  athleteSports?: string[] | null;
  /** Optional anonymised rank summaries to power the "How you compare" slide. */
  rankings?: PresentationRanking[];
  onClose: () => void;
}

/**
 * Full-screen, athlete-facing "Present Results" mode.
 *
 * Designed for sit-down explanation in person:
 *  - giant readable text
 *  - one card per slide
 *  - keyboard ←/→ + on-screen controls
 *  - distraction-free (covers entire screen, z-[2000])
 */
export const PresentationMode = ({ athleteName, snapshots, athleteSports, onClose }: Props) => {
  const sportContext = sportComparisonLabel(athleteSports, '');
  const [idx, setIdx] = useState(0);
  // Slide order: title → each metric → summary
  const totalSlides = snapshots.length + 2;

  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(totalSlides - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, totalSlides]);

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
    if (Math.abs(d) < 50) return;
    if (d < 0) setIdx((i) => Math.min(totalSlides - 1, i + 1));
    else setIdx((i) => Math.max(0, i - 1));
  };

  const goingWell = snapshots.filter((s) => s.interpretation.tier === 'excellent' || s.interpretation.tier === 'good');
  const focusAreas = snapshots.filter((s) => s.interpretation.tier === 'needs_focus' || s.interpretation.tier === 'developing');

  const renderSlide = () => {
    if (idx === 0) {
      return (
        <div className="text-center max-w-3xl px-6">
          <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">Your Results</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">{athleteName}</h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-6">
            Let's walk through where you are and what comes next.
          </p>
          {sportContext && (
            <Badge variant="outline" className="mt-6 text-sm px-3 py-1">{sportContext}</Badge>
          )}
        </div>
      );
    }
    if (idx === totalSlides - 1) {
      return (
        <div className="max-w-3xl px-6 w-full">
          <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2 text-center">Summary</div>
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-10">Where to next</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-6">
              <div className="flex items-center gap-2 text-emerald-600 mb-3">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">What's going well</span>
              </div>
              {goingWell.length === 0 ? (
                <p className="text-muted-foreground">Plenty to build on.</p>
              ) : (
                <ul className="space-y-2 text-base">
                  {goingWell.map((g) => (
                    <li key={g.spec.label}>• {g.interpretation.title}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border p-6">
              <div className="flex items-center gap-2 text-amber-600 mb-3">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Next focus</span>
              </div>
              {focusAreas.length === 0 ? (
                <p className="text-muted-foreground">Keep doing what you're doing.</p>
              ) : (
                <ul className="space-y-2 text-base">
                  {focusAreas.map((f) => (
                    <li key={f.spec.label}>• {f.interpretation.focusSuggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      );
    }
    const snap = snapshots[idx - 1];
    if (!snap) return null;
    const styles = tierStyles[snap.interpretation.tier];
    return (
      <div className="text-center max-w-3xl px-6">
        <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {snap.interpretation.category}
        </div>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight">{snap.interpretation.title}</h2>
        <div className={`inline-flex items-center rounded-full border px-4 py-1.5 text-base font-medium mt-6 ${styles.badge}`}>
          {snap.interpretation.ratingLabel}
        </div>
        <p className="text-xl md:text-2xl mt-8 leading-relaxed">{snap.interpretation.explanation}</p>
        {snap.interpretation.focusSuggestion && (
          <p className="text-base md:text-lg text-muted-foreground mt-4">{snap.interpretation.focusSuggestion}</p>
        )}
        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div>
            <div className="text-xs uppercase tracking-wide">Latest</div>
            <div className="text-2xl font-semibold text-foreground">{snap.latestDisplay ?? '—'}</div>
          </div>
          {snap.changePct != null && (
            <div>
              <div className="text-xs uppercase tracking-wide">Change</div>
              <Badge variant={snap.isImprovement ? 'default' : 'secondary'} className="text-base">
                {snap.changePct > 0 ? '+' : ''}{snap.changePct.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] bg-background flex flex-col h-[100dvh] overflow-hidden touch-pan-y"
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
      {/* Header — exit always visible */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Presentation Mode · </span>
          {idx + 1} / {totalSlides}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 h-10 px-3">
          <X className="h-5 w-5" /> Exit
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-y-auto overflow-x-hidden py-6 sm:py-8 px-2">
        {renderSlide()}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t bg-background/80 backdrop-blur shrink-0">
        <Button
          variant="outline"
          size="lg"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="gap-2 h-12 min-w-[5rem]"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-1 flex-wrap justify-center max-w-[60%]">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === idx ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <Button
          size="lg"
          disabled={idx === totalSlides - 1}
          onClick={() => setIdx((i) => Math.min(totalSlides - 1, i + 1))}
          className="gap-2 h-12 min-w-[5rem]"
          aria-label="Next slide"
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>,
    document.body,
  );
};
