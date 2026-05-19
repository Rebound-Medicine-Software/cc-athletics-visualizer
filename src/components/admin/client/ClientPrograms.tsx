import { useEffect, useMemo, useRef, useState } from 'react';
import {
  format, parseISO, startOfWeek, isAfter, subDays, differenceInCalendarDays, addDays,
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Sparkles, Target, ChevronRight, Flame, Trophy, Zap, ShieldCheck,
  Activity, CheckCircle2, Clock, PlayCircle, Lock, Lightbulb, Wand2,
  ArrowUpRight, CalendarDays, Dumbbell, HeartPulse, Info, Brain,
} from 'lucide-react';
import { useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import {
  useClientAssignments, useClientCompletionLogs,
} from '@/components/programming/client/useClientAssignments';
import { useTemplateStructure } from '@/components/programming/assignments/useAssignments';
import { ClientExerciseSheet } from '@/components/programming/client/ClientExerciseSheet';
import { ClientSessionFeedbackSheet } from '@/components/programming/client/ClientSessionFeedbackSheet';
import { computeAdherence } from '@/components/programming/assignments/adherence';
import { useClientMetrics } from './useClientMetrics';
import { getSessionVisual } from './sessionVisuals';
import type { ExerciseOverride } from '@/components/programming/assignments/types';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'sessions' | 'progress';

/* ───────────────────── primitives ───────────────────── */

const useCountUp = (target: number, duration = 900) => {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    startRef.current = null;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const Segmented = ({
  value, onChange, items,
}: {
  value: TabKey;
  onChange: (v: TabKey) => void;
  items: { key: TabKey; label: string }[];
}) => {
  const activeIdx = Math.max(0, items.findIndex((i) => i.key === value));
  return (
    <div className="card-premium rounded-2xl p-1 relative overflow-hidden">
      <div
        className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-br from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))] shadow-[0_8px_22px_-12px_hsl(var(--athlete-green)/0.7)]"
        style={{
          width: `calc((100% - 0.5rem) / ${items.length})`,
          left: `calc(0.25rem + ${activeIdx} * ((100% - 0.5rem) / ${items.length}))`,
          transition: 'left 360ms cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => {
          const active = it.key === value;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={cn(
                'h-9 rounded-xl text-[12px] font-bold tracking-wide transition-colors duration-300 z-[1]',
                active ? 'text-[hsl(210_50%_5%)]' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SectionLabel = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="flex items-end justify-between gap-3 px-1">
    <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">{children}</h3>
    {hint && <span className="text-[10px] text-muted-foreground/70 truncate">{hint}</span>}
  </div>
);

const Pill = ({
  icon: Icon, children, tone = 'default',
}: { icon?: any; children: React.ReactNode; tone?: 'default' | 'gold' | 'green' | 'cyan' | 'violet' }) => {
  const toneCls =
    tone === 'gold' ? 'bg-primary/15 text-primary border-primary/25' :
    tone === 'green' ? 'bg-[hsl(var(--athlete-green)/0.14)] text-[hsl(var(--athlete-green))] border-[hsl(var(--athlete-green)/0.25)]' :
    tone === 'cyan' ? 'bg-[hsl(var(--athlete-cyan)/0.14)] text-[hsl(var(--athlete-cyan))] border-[hsl(var(--athlete-cyan)/0.25)]' :
    tone === 'violet' ? 'bg-[hsl(var(--athlete-violet)/0.14)] text-[hsl(var(--athlete-violet))] border-[hsl(var(--athlete-violet)/0.25)]' :
    'bg-white/5 text-muted-foreground border-white/10';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] border', toneCls)}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
};

/* ───────────────────── prescription chips ───────────────────── */

const PrescriptionChips = ({ m }: { m: any }) => {
  const items: Array<{ label: string; value: string }> = [];
  if (m.sets || m.reps) items.push({ label: 'Do', value: `${m.sets ?? '–'} × ${m.reps ?? '–'}` });
  if (m.load) items.push({ label: 'Load', value: String(m.load) });
  if (m.tempo) items.push({ label: 'Tempo', value: String(m.tempo) });
  if (m.rest_seconds) items.push({ label: 'Rest', value: `${m.rest_seconds}s` });
  if (m.rpe) items.push({ label: 'RPE', value: String(m.rpe) });
  if (!items.length) return <p className="text-[11px] italic text-muted-foreground">No prescription</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/10 px-1.5 py-0.5 text-[10px]">
          <span className="text-muted-foreground/80 font-semibold">{it.label}</span>
          <span className="font-bold num">{it.value}</span>
        </span>
      ))}
    </div>
  );
};

/* ───────────────────── derived intelligence ───────────────────── */

const inferProgramIntel = (
  templateName: string | null | undefined,
  goal: string | null | undefined,
  metrics: any[] | undefined,
) => {
  const t = `${templateName ?? ''} ${goal ?? ''}`.toLowerCase();
  const weakestImprovement = (metrics ?? [])
    .filter((m) => m.changePct != null)
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))[0];

  // Heuristic focus
  let focus = 'Reactive strength + force production';
  let outcome = '+6–10% RSI · improved symmetry';
  let issue = 'Force production deficit';
  let confidence = 92;
  if (/recover|mobility|rehab|prehab|return/.test(t)) {
    focus = 'Tissue tolerance + movement restoration';
    outcome = 'Restored mobility · reduced load sensitivity';
    issue = 'Recovery & resilience focus';
    confidence = 88;
  } else if (/speed|sprint|accel/.test(t)) {
    focus = 'Acceleration + stride power';
    outcome = '+0.05–0.10s on 10m split';
    issue = 'Acceleration mechanics';
    confidence = 90;
  } else if (/upper|press|bench/.test(t)) {
    focus = 'Upper-body force expression';
    outcome = '+5–8% pressing strength';
    issue = 'Upper-body strength gap';
    confidence = 86;
  } else if (/rotation|throw|swing/.test(t)) {
    focus = 'Rotational power + hip-shoulder separation';
    outcome = 'Sharper torque · cleaner transfer';
    issue = 'Rotational power asymmetry';
    confidence = 87;
  }

  // Personalise issue using weakest metric trend if available
  if (weakestImprovement?.spec?.label && (weakestImprovement.changePct ?? 0) < 0) {
    issue = `${weakestImprovement.spec.label} trending down (${weakestImprovement.changePct?.toFixed(1)}%)`;
  }

  return { focus, outcome, issue, confidence };
};

/* ───────────────────── HERO ───────────────────── */

const PlanHero = ({
  templateName, goal, athleteSport, athleteSex, daysIn, durationWeeks, confidence,
  focus, outcome, issue,
}: {
  templateName: string;
  goal: string;
  athleteSport: string | null;
  athleteSex: string | null;
  daysIn: number;
  durationWeeks: number | null;
  confidence: number;
  focus: string; outcome: string; issue: string;
}) => {
  const visual = getSessionVisual({
    sport: athleteSport,
    sex: athleteSex,
    sessionTitle: templateName,
    programType: goal,
  });
  const animatedConf = useCountUp(confidence);
  return (
    <Card className="card-premium card-glow rounded-3xl border-0 overflow-hidden relative">
      <div className="relative h-[180px] w-full overflow-hidden">
        <img src={visual.image} alt="" className="absolute inset-0 h-full w-full object-cover scale-[1.02]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-[hsl(var(--athlete-l1))]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_0%_100%,hsl(var(--athlete-green)/0.35),transparent_60%)]" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <Pill icon={Sparkles} tone="gold">AI Recommended</Pill>
          <Pill icon={ShieldCheck} tone="green">{Math.round(animatedConf)}% match</Pill>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/80 font-bold">{visual.tag}</div>
          <h2 className="text-white font-bold leading-[1.1] tracking-[-0.02em] mt-1 text-[clamp(1.25rem,5.6vw,1.7rem)]">
            {templateName}
          </h2>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl surface-2 px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Day</div>
            <div className="text-lg font-bold num leading-tight">{daysIn + 1}</div>
            {durationWeeks && <div className="text-[10px] text-muted-foreground">of {durationWeeks * 7}</div>}
          </div>
          <div className="rounded-2xl surface-2 px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Focus</div>
            <div className="text-[12px] font-bold leading-tight line-clamp-2">{focus}</div>
          </div>
          <div className="rounded-2xl surface-2 px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--athlete-green))] font-semibold">Outcome</div>
            <div className="text-[12px] font-bold leading-tight line-clamp-2 text-[hsl(var(--athlete-green))]">{outcome}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary font-bold">
            <Wand2 className="h-3.5 w-3.5" /> Prescribed because
          </div>
          <p className="text-[13px] font-medium leading-snug mt-1">{issue}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/* ───────────────────── target metric card ───────────────────── */

const TargetMetricCard = ({
  label, current, target, unit, weeksLeft,
}: {
  label: string;
  current: number | null;
  target: number | null;
  unit: string;
  weeksLeft: number;
}) => {
  const pct = current != null && target != null && target > 0
    ? Math.max(0, Math.min(100, Math.round((current / target) * 100)))
    : 0;
  const animated = useCountUp(pct);
  return (
    <Card className="card-premium rounded-2xl border-0 overflow-hidden">
      <CardContent className="p-3.5 space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold truncate">{label}</span>
          <Pill icon={Clock} tone="cyan">{weeksLeft}w</Pill>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[22px] font-bold num leading-none">
            {current != null ? current.toFixed(2) : '—'}
          </span>
          <span className="text-[11px] text-muted-foreground">→</span>
          <span className="text-[15px] font-bold num text-[hsl(var(--athlete-green))] leading-none">
            {target != null ? target.toFixed(2) : '—'}
          </span>
          {unit && <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>}
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))]"
            style={{ width: `${animated}%`, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground">{Math.round(animated)}% toward target</div>
      </CardContent>
    </Card>
  );
};

/* ───────────────────── today's priority CTA ───────────────────── */

const TodayPriorityCard = ({
  session, exerciseCount, durationMin, focus, onStart, onWhy, readinessAdjust, disabled,
}: {
  session: any;
  exerciseCount: number;
  durationMin: number;
  focus: string;
  onStart: () => void;
  onWhy: () => void;
  readinessAdjust: number | null;
  disabled: boolean;
}) => (
  <Card className="card-premium card-electric rounded-3xl border-0 overflow-hidden relative">
    <div
      aria-hidden
      className="absolute inset-0 opacity-60 pointer-events-none"
      style={{ background: 'radial-gradient(80% 60% at 100% 0%, hsl(var(--athlete-cyan)/0.16), transparent 60%)' }}
    />
    <CardContent className="p-4 relative">
      <div className="flex items-center justify-between">
        <Pill icon={Zap} tone="cyan">Today's priority</Pill>
        {readinessAdjust != null && (
          <Pill icon={HeartPulse} tone="violet">
            {readinessAdjust > 0 ? `+${readinessAdjust}%` : `${readinessAdjust}%`} adapted
          </Pill>
        )}
      </div>
      <h3 className="mt-2 text-[clamp(1.05rem,4.6vw,1.3rem)] font-bold leading-tight tracking-[-0.01em]">
        {session?.name ?? 'Recovery & Mobility'}
      </h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Dumbbell className="h-3 w-3" /> {exerciseCount} exercises</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ~{durationMin} min</span>
        <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {focus}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="lg"
          disabled={disabled}
          onClick={onStart}
          className="flex-1 h-11 rounded-2xl text-sm font-bold bg-gradient-to-br from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))] text-[hsl(210_50%_5%)] hover:opacity-95 shadow-[0_10px_30px_-12px_hsl(var(--athlete-green)/0.7)]"
        >
          <PlayCircle className="h-4 w-4 mr-1.5" /> Start session
        </Button>
        <Button size="lg" variant="ghost" onClick={onWhy} className="h-11 px-3 rounded-2xl text-[12px] font-bold">
          <Info className="h-4 w-4 mr-1" /> Why?
        </Button>
      </div>
    </CardContent>
  </Card>
);

/* ───────────────────── session card ───────────────────── */

const SessionCard = ({
  session, startDate, onOpen, variant,
}: {
  session: any;
  startDate: Date | null;
  onOpen: () => void;
  variant: 'today' | 'upcoming' | 'past';
}) => {
  const visual = getSessionVisual({ sessionTitle: session.name });
  const date = startDate ? addDays(startDate, session.day_offset) : null;
  return (
    <button
      onClick={onOpen}
      className={cn(
        'group w-full text-left card-premium rounded-2xl border-0 overflow-hidden transition-transform active:scale-[0.99] relative',
        variant === 'today' && 'card-glow',
        variant === 'past' && session.completed && 'opacity-90',
      )}
    >
      <div className="flex items-stretch gap-3 p-3">
        <div className="relative h-[72px] w-[72px] shrink-0 rounded-2xl overflow-hidden">
          <img src={visual.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {session.completed && (
            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--athlete-green))/0.35]">
              <CheckCircle2 className="h-7 w-7 text-white drop-shadow" />
            </div>
          )}
          {variant === 'today' && !session.completed && (
            <div className="absolute bottom-1 left-1 right-1 text-[8px] font-bold uppercase tracking-[0.18em] text-white text-center">
              Today
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--athlete-cyan))] font-bold truncate">
                {session.block?.name ?? 'Block'} · D+{session.day_offset}
              </span>
              {session.completed && (
                <Pill icon={CheckCircle2} tone="green">Done</Pill>
              )}
            </div>
            <div className="text-sm font-bold leading-tight truncate mt-0.5">{session.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {session.exercises.length} exercises{date ? ` · ${format(date, 'EEE d MMM')}` : ''}
            </div>
          </div>
          {variant === 'today' && !session.completed && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--athlete-green))] mt-1">
              Start <ChevronRight className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

/* ───────────────────── Session detail sheet ───────────────────── */

const SessionDetailSheet = ({
  open, onOpenChange, session, structure, overrides, onStartExercise, onLogSession, isViewAs,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  session: any | null;
  structure: any;
  overrides: Record<string, ExerciseOverride>;
  onStartExercise: (ex: any) => void;
  onLogSession: () => void;
  isViewAs: boolean;
}) => {
  if (!session) return null;
  const visual = getSessionVisual({ sessionTitle: session.name });
  const merge = (ex: any) => {
    const ov = overrides[ex.id] ?? {};
    return {
      sets: ov.sets ?? ex.sets,
      reps: ov.reps ?? ex.reps,
      load: ov.load ?? ex.load,
      tempo: ov.tempo ?? ex.tempo,
      rest_seconds: ov.rest_seconds ?? ex.rest_seconds,
      rpe: ov.rpe ?? ex.rpe,
      notes: ov.notes ?? ex.notes,
      hasOverride: !!overrides[ex.id],
    };
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] p-0 rounded-t-[28px] border-0 bg-[hsl(var(--athlete-l1))] overflow-hidden flex flex-col"
      >
        <div className="relative h-[160px] shrink-0">
          <img src={visual.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[hsl(var(--athlete-l1))]" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-white/30" />
          <SheetHeader className="absolute bottom-3 left-4 right-4 text-left space-y-1">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/80 font-bold">
              {session.block?.name ?? 'Session'} · {session.exercises.length} exercises
            </div>
            <SheetTitle className="text-white text-[20px] font-bold leading-tight">{session.name}</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary font-bold">
              <Lightbulb className="h-3.5 w-3.5" /> Why this session
            </div>
            <p className="text-[13px] font-medium leading-snug mt-1">{visual.blurb}</p>
          </div>

          <SectionLabel>Exercises</SectionLabel>
          {session.exercises.length === 0 ? (
            <div className="rounded-2xl card-premium p-5 text-center text-sm text-muted-foreground">
              No exercises in this session.
            </div>
          ) : (
            session.exercises.map((ex: any, idx: number) => {
              const m = merge(ex);
              const lib = structure?.library?.[ex.exercise_id] ?? {};
              const payload = {
                id: ex.id,
                name: lib.name ?? 'Exercise',
                category: lib.category ?? null,
                video_url: lib.video_url ?? null,
                instructions: lib.instructions ?? null,
                primary_muscles: lib.primary_muscles ?? null,
                equipment: lib.equipment ?? null,
                sets: m.sets,
                reps: m.reps,
                load: m.load,
                rpe: m.rpe,
                rest_seconds: m.rest_seconds,
                tempo: m.tempo,
                notes: m.notes,
              };
              return (
                <Card
                  key={ex.id}
                  onClick={() => !isViewAs && onStartExercise(payload)}
                  className="card-premium rounded-2xl border-0 cursor-pointer transition active:scale-[0.99] hover:bg-white/[0.02]"
                >
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[hsl(var(--athlete-green)/0.14)] text-[hsl(var(--athlete-green))] flex items-center justify-center font-bold text-sm num shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold leading-tight truncate">{lib.name ?? 'Exercise'}</h4>
                          {m.hasOverride && <Pill tone="gold">Adjusted</Pill>}
                        </div>
                        {lib.category && (
                          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">{lib.category}</div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                    <PrescriptionChips m={m} />
                    {m.notes && (
                      <div className="rounded-xl bg-white/[0.04] border border-white/10 px-2.5 py-1.5">
                        <div className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--athlete-cyan))] font-bold mb-0.5">Coach note</div>
                        <p className="text-[11px] italic text-muted-foreground leading-snug">{m.notes}</p>
                      </div>
                    )}
                    <Button
                      size="sm" variant="ghost" disabled={isViewAs}
                      onClick={(e) => { e.stopPropagation(); onStartExercise(payload); }}
                      className="w-full justify-between h-9 rounded-xl text-[12px] font-bold"
                    >
                      View &amp; log exercise <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[hsl(var(--athlete-l1))] to-transparent">
          <Button
            disabled={isViewAs}
            onClick={onLogSession}
            className="w-full h-12 rounded-2xl text-sm font-bold bg-gradient-to-br from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))] text-[hsl(210_50%_5%)] shadow-[0_10px_30px_-12px_hsl(var(--athlete-green)/0.7)]"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark session complete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ───────────────────── empty states ───────────────────── */

const EmptyHero = ({ title, body }: { title: string; body: string }) => (
  <Card className="card-premium rounded-3xl border-0">
    <CardContent className="p-8 text-center space-y-3">
      <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="text-[12px] text-muted-foreground leading-snug max-w-xs mx-auto">{body}</p>
    </CardContent>
  </Card>
);

/* ───────────────────── main ───────────────────── */

export const ClientPrograms = () => {
  const isViewAs = useIsViewAsMode();
  const { data: athlete, isLoading: athleteLoading } = useClientAthlete();
  const { data: assignments = [], isLoading: aLoading } = useClientAssignments(athlete?.id ?? null);

  const active = assignments.find((a: any) => a.status === 'active') ?? assignments[0] ?? null;
  const { data: structure, isLoading: sLoading } = useTemplateStructure(active?.template_id ?? null);
  const { data: logs = [] } = useClientCompletionLogs(active?.id ?? null);
  const { data: metrics } = useClientMetrics({
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  });

  const [tab, setTab] = useState<TabKey>('overview');
  const [exerciseSheetOpen, setExerciseSheetOpen] = useState(false);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [selectedSessionForLog, setSelectedSessionForLog] = useState<any>(null);
  const [detailSession, setDetailSession] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  const overrides: Record<string, ExerciseOverride> =
    (active?.override_payload as Record<string, ExerciseOverride>) ?? {};

  const today = new Date();
  const startDate = active?.start_date ? parseISO(active.start_date) : null;
  const daysSinceStart = startDate ? differenceInCalendarDays(today, startDate) : 0;

  const sessionGroups = useMemo(() => {
    if (!structure) return { today: [], upcoming: [], past: [] as any[] };
    const blockMap = Object.fromEntries((structure.blocks ?? []).map((b: any) => [b.id, b]));
    const exBySession: Record<string, any[]> = {};
    const blockLevelByBlock: Record<string, any[]> = {};
    (structure.exercises ?? []).forEach((ex: any) => {
      if (ex.session_id) (exBySession[ex.session_id] = exBySession[ex.session_id] ?? []).push(ex);
      else (blockLevelByBlock[ex.block_id] = blockLevelByBlock[ex.block_id] ?? []).push(ex);
    });
    const completedIds = new Set(
      (logs ?? []).map((l: any) => l.programming_session_id).filter(Boolean)
    );
    const enriched = (structure.sessions ?? []).map((s: any) => ({
      ...s,
      block: blockMap[s.block_id],
      // Session-scoped exercises + block-level (unscheduled) exercises inherited from the parent block
      exercises: [...(exBySession[s.id] ?? []), ...(blockLevelByBlock[s.block_id] ?? [])],
      completed: completedIds.has(s.id),
    }));
    return {
      today: enriched.filter((s) => s.day_offset === daysSinceStart),
      upcoming: enriched.filter((s) => s.day_offset > daysSinceStart).sort((a, b) => a.day_offset - b.day_offset).slice(0, 8),
      past: enriched.filter((s) => s.day_offset < daysSinceStart).sort((a, b) => b.day_offset - a.day_offset).slice(0, 8),
    };
  }, [structure, logs, daysSinceStart]);

  const adherence = useMemo(() => computeAdherence({
    startDate: active?.start_date,
    sessions: structure?.sessions ?? [],
    blocks: structure?.blocks ?? [],
    completionLogs: logs as any,
  }), [active, structure, logs]);

  const intel = useMemo(
    () => inferProgramIntel(active?.template_name, active?.programming_templates?.goal, metrics),
    [active, metrics],
  );

  const athleteSport = (athlete?.sports as string[] | null)?.[0] ?? null;
  const athleteSex = (athlete as any)?.sex ?? null;
  const durationWeeks = active?.programming_templates?.duration_weeks ?? null;

  const todaysSession = sessionGroups.today[0] ?? sessionGroups.upcoming[0] ?? null;
  const todaysExCount = todaysSession?.exercises?.length ?? 0;
  const todaysDuration = Math.max(15, todaysExCount * 6);

  const openSessionDetail = (s: any) => {
    setDetailSession(s);
    setDetailOpen(true);
  };
  const openLogForSession = (s: any) => {
    setDetailOpen(false);
    setSelectedExercise(null);
    setSelectedSessionForLog(s ? { id: s.id, name: s.name } : null);
    setSessionSheetOpen(true);
  };
  const openLogForExercise = (ex: any) => {
    setSelectedSessionForLog(null);
    setSelectedExercise(ex);
    setExerciseSheetOpen(true);
  };

  /* ───── loading & empty ───── */

  if (athleteLoading || aLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-40 rounded-2xl" />
        <Skeleton className="h-[260px] w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-4">
        <EmptyHero
          title="Athlete profile not linked"
          body="Your account isn't linked to an athlete profile yet. Ask your practitioner to connect it."
        />
      </div>
    );
  }

  if (!assignments.length) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="px-1 text-[22px] font-bold tracking-[-0.02em]">My programs</h2>
        <EmptyHero
          title="No program assigned yet"
          body="Once your practitioner prescribes a plan, your AI-guided program will appear here with personalised metrics."
        />
      </div>
    );
  }

  /* ───── render ───── */

  return (
    <div className="px-4 pt-3 pb-28 space-y-5">
      {/* Header */}
      <div className="px-1 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">My program</div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight truncate">
            {active?.template_name ?? 'Performance plan'}
          </h2>
        </div>
        {isViewAs && <Pill icon={Lock} tone="gold">View only</Pill>}
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'sessions', label: 'Sessions' },
          { key: 'progress', label: 'Progress' },
        ]}
      />

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-5 animate-fade-in">
          <PlanHero
            templateName={active?.template_name ?? 'Performance plan'}
            goal={active?.programming_templates?.goal ?? ''}
            athleteSport={athleteSport}
            athleteSex={athleteSex}
            daysIn={daysSinceStart}
            durationWeeks={durationWeeks}
            confidence={intel.confidence}
            focus={intel.focus}
            outcome={intel.outcome}
            issue={intel.issue}
          />

          <Card className="card-premium rounded-3xl border-0">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--athlete-cyan))] font-bold">
                <Brain className="h-3.5 w-3.5" /> Why this program?
              </div>
              <p className="text-[13px] leading-snug">
                {active?.programming_templates?.description
                  || `Your recent testing identified a focus area in ${intel.focus.toLowerCase()}. This plan is designed to address ${intel.issue.toLowerCase()} and progressively move you toward ${intel.outcome.toLowerCase()}.`}
              </p>
              <ul className="mt-1 space-y-1.5 text-[12px]">
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[hsl(var(--athlete-green))]" /> Improve landing mechanics & force absorption</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-[hsl(var(--athlete-cyan))]" /> Build reactive strength & explosive power</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-primary" /> Restore symmetry & reduce asymmetry risk</li>
              </ul>
            </CardContent>
          </Card>

          <TodayPriorityCard
            session={todaysSession}
            exerciseCount={todaysExCount}
            durationMin={todaysDuration}
            focus={intel.focus.split(' ').slice(0, 3).join(' ')}
            onStart={() => todaysSession ? openSessionDetail(todaysSession) : null}
            onWhy={() => setWhyOpen(true)}
            readinessAdjust={adherence.weekAdherence < 60 ? -8 : null}
            disabled={isViewAs || !todaysSession}
          />

          <section className="space-y-3">
            <SectionLabel hint="Personalised from your tests">Target metrics</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {(metrics ?? []).slice(0, 4).map((m: any) => {
                const current = m.latest?.value ?? null;
                const target = current != null
                  ? +(current * (m.spec.higherIsBetter ? 1.08 : 0.92)).toFixed(2)
                  : null;
                return (
                  <TargetMetricCard
                    key={m.spec.short}
                    label={m.spec.label}
                    current={current}
                    target={target}
                    unit={m.spec.unit}
                    weeksLeft={durationWeeks ? Math.max(1, durationWeeks - Math.floor(daysSinceStart / 7)) : 4}
                  />
                );
              })}
              {(!metrics || metrics.length === 0) && (
                <div className="col-span-2">
                  <Card className="card-premium rounded-2xl border-0">
                    <CardContent className="p-4 text-[12px] text-muted-foreground">
                      Target metrics will appear after your first test result.
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </section>

          <Card className="card-premium rounded-2xl border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--athlete-violet)/0.14)] text-[hsl(var(--athlete-violet))] flex items-center justify-center shrink-0">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[hsl(var(--athlete-violet))]">Why today changed</div>
                <p className="text-[12px] leading-snug mt-0.5">
                  {adherence.weekAdherence < 60
                    ? "Recovery lower than baseline — today's volume reduced 10% to protect quality."
                    : 'Holding intended intensity. Quality is the goal — make every rep count.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SESSIONS */}
      {tab === 'sessions' && (
        <div className="space-y-5 animate-fade-in">
          {sLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
          {!sLoading && (
            <>
              {sessionGroups.today.length > 0 && (
                <section className="space-y-2.5">
                  <SectionLabel>Today</SectionLabel>
                  {sessionGroups.today.map((s) => (
                    <SessionCard key={s.id} session={s} startDate={startDate} onOpen={() => openSessionDetail(s)} variant="today" />
                  ))}
                </section>
              )}

              {sessionGroups.upcoming.length > 0 && (
                <section className="space-y-2.5">
                  <SectionLabel>Upcoming</SectionLabel>
                  {sessionGroups.upcoming.map((s) => (
                    <SessionCard key={s.id} session={s} startDate={startDate} onOpen={() => openSessionDetail(s)} variant="upcoming" />
                  ))}
                </section>
              )}

              {sessionGroups.past.length > 0 && (
                <section className="space-y-2.5">
                  <SectionLabel>Recent</SectionLabel>
                  {sessionGroups.past.map((s) => (
                    <SessionCard key={s.id} session={s} startDate={startDate} onOpen={() => openSessionDetail(s)} variant="past" />
                  ))}
                </section>
              )}

              {!sessionGroups.today.length && !sessionGroups.upcoming.length && !sessionGroups.past.length && (
                <EmptyHero
                  title="No sessions scheduled"
                  body="Your practitioner hasn't scheduled sessions yet. Check back soon."
                />
              )}
            </>
          )}
        </div>
      )}

      {/* PROGRESS */}
      {tab === 'progress' && (
        <div className="space-y-5 animate-fade-in">
          <Card className="card-premium card-glow rounded-3xl border-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Pill icon={Trophy} tone="gold">Program timeline</Pill>
                <Pill icon={Flame} tone="green">{adherence.currentStreak} streak</Pill>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-2xl surface-2 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-bold">Done</div>
                  <div className="text-xl font-bold num">{adherence.completedSessions}</div>
                </div>
                <div className="rounded-2xl surface-2 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-bold">Missed</div>
                  <div className="text-xl font-bold num">{adherence.missedSessions}</div>
                </div>
                <div className="rounded-2xl surface-2 px-3 py-2">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--athlete-green))] font-bold">Adherence</div>
                  <div className="text-xl font-bold num text-[hsl(var(--athlete-green))]">{adherence.adherencePercentage}%</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Consistency</div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--athlete-green))] via-[hsl(var(--athlete-cyan))] to-primary"
                    style={{ width: `${adherence.adherencePercentage}%`, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <section className="space-y-2.5">
            <SectionLabel>Milestones</SectionLabel>
            {[1, 2, 3, 4].map((week) => {
              const passed = daysSinceStart >= week * 7;
              const current = !passed && daysSinceStart >= (week - 1) * 7;
              return (
                <Card key={week} className={cn(
                  'card-premium rounded-2xl border-0 relative overflow-hidden',
                  current && 'card-electric',
                  !passed && !current && 'opacity-60',
                )}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 font-bold num text-sm',
                      passed ? 'bg-[hsl(var(--athlete-green)/0.18)] text-[hsl(var(--athlete-green))]' :
                      current ? 'bg-[hsl(var(--athlete-cyan)/0.18)] text-[hsl(var(--athlete-cyan))]' :
                      'bg-white/[0.05] text-muted-foreground',
                    )}>
                      W{week}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">
                        Week {week} {passed ? 'complete' : current ? 'in progress' : 'upcoming'}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {passed ? 'Unlocked: Explosive Athlete badge' :
                          current ? 'Stay consistent to unlock' : 'Locked until earlier weeks complete'}
                      </div>
                    </div>
                    {passed ? <Trophy className="h-4 w-4 text-primary" /> :
                      current ? <Activity className="h-4 w-4 text-[hsl(var(--athlete-cyan))]" /> :
                      <Lock className="h-4 w-4 text-muted-foreground" />}
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Metric improvements */}
          <section className="space-y-2.5">
            <SectionLabel hint="Testing → program → improvement">Metric improvements</SectionLabel>
            {(metrics ?? []).slice(0, 4).map((m: any) => {
              const change = m.changePct;
              const positive = m.isImprovement === true;
              return (
                <Card key={m.spec.short} className="card-premium rounded-2xl border-0">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0',
                      positive ? 'bg-[hsl(var(--athlete-green)/0.14)] text-[hsl(var(--athlete-green))]' :
                      change == null ? 'bg-white/[0.05] text-muted-foreground' :
                      'bg-destructive/15 text-destructive',
                    )}>
                      <ArrowUpRight className={cn('h-5 w-5', !positive && change != null && 'rotate-90')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{m.spec.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {change != null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs baseline` : 'Awaiting next test'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[18px] font-bold num leading-none">
                        {m.latest ? m.latest.value.toFixed(2) : '—'}
                      </div>
                      {m.spec.unit && <div className="text-[10px] text-muted-foreground">{m.spec.unit}</div>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!metrics || metrics.length === 0) && (
              <EmptyHero
                title="No measurable improvements yet"
                body="Complete a test and a few sessions to see your testing-to-program impact light up here."
              />
            )}
          </section>

          {/* Next step */}
          <Card className="card-premium rounded-2xl border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold">Next step</div>
                <p className="text-[12px] leading-snug mt-0.5">
                  Retest recommended in ~10 days to lock in your gains and recalibrate the program.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session detail sheet */}
      <SessionDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={detailSession}
        structure={structure}
        overrides={overrides}
        onStartExercise={openLogForExercise}
        onLogSession={() => openLogForSession(detailSession)}
        isViewAs={isViewAs}
      />

      {/* Why this session sheet */}
      <Sheet open={whyOpen} onOpenChange={setWhyOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-0 bg-[hsl(var(--athlete-l1))] p-5 space-y-3"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-[18px] font-bold">Why this session</SheetTitle>
          </SheetHeader>
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold">Prescribed because</div>
            <p className="text-[13px] font-medium leading-snug mt-1">{intel.issue}</p>
          </div>
          <div className="rounded-2xl surface-2 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Focus</div>
            <p className="text-[13px] mt-1">{intel.focus}</p>
          </div>
          <div className="rounded-2xl surface-2 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--athlete-green))] font-bold">Expected outcome</div>
            <p className="text-[13px] mt-1">{intel.outcome}</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Premium exercise logging sheet */}
      {active && athlete && (
        <ClientExerciseSheet
          open={exerciseSheetOpen}
          onOpenChange={setExerciseSheetOpen}
          assignment={{ id: active.id, team_id: active.team_id, athlete_id: active.athlete_id }}
          athleteId={athlete.id}
          exercise={selectedExercise}
          readOnly={isViewAs}
        />
      )}
      {/* Premium session feedback sheet */}
      {active && athlete && (
        <ClientSessionFeedbackSheet
          open={sessionSheetOpen}
          onOpenChange={setSessionSheetOpen}
          assignment={{ id: active.id, team_id: active.team_id, athlete_id: active.athlete_id }}
          athleteId={athlete.id}
          session={selectedSessionForLog}
          exerciseCount={detailSession?.exercises?.length}
        />
      )}
    </div>
  );
};

export default ClientPrograms;
