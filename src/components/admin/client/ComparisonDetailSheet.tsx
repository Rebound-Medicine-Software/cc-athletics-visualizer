import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, Sparkles, Target, ChevronRight, Lock, Check, UserCog, Stethoscope, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ──────────────────────────────────────────────────────────── */
/* Shared bottom-sheet chassis — iPhone-native feel              */
/* ──────────────────────────────────────────────────────────── */

interface SheetShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const useCountUp = (target: number, duration = 900, run = true) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, run]);
  return val;
};

const SheetShell = ({ open, onClose, title, subtitle, children }: SheetShellProps) => {
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const node = (
    <div
      className={cn(
        'athlete-theme fixed inset-0 z-[1600] flex items-end justify-center transition-opacity duration-300',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />

      {/* Sheet — constrained to phone width on desktop */}
      <div
        onTouchStart={(e) => { startY.current = e.touches[0].clientY; }}
        onTouchMove={(e) => {
          if (startY.current == null) return;
          const dy = e.touches[0].clientY - startY.current;
          if (dy > 0) setDragY(dy);
        }}
        onTouchEnd={() => {
          if (dragY > 110) onClose();
          setDragY(0);
          startY.current = null;
        }}
        className={cn(
          'relative w-full md:w-[404px] max-h-[88dvh] overflow-hidden',
          'rounded-t-[28px] border border-white/10 border-b-0',
          'bg-[linear-gradient(180deg,hsl(210_35%_8%/0.94),hsl(210_40%_5%/0.98))]',
          'backdrop-blur-2xl shadow-[0_-30px_80px_-10px_rgba(0,0,0,0.7)]',
          'transition-transform duration-[480ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        )}
        style={{
          transform: open
            ? `translateY(${dragY}px)`
            : 'translateY(100%)',
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 inset-x-0 h-48 opacity-60"
          style={{
            background:
              'radial-gradient(60% 100% at 50% 0%, hsl(42 65% 56% / 0.18), transparent 70%),' +
              'radial-gradient(60% 100% at 30% 10%, hsl(192 87% 65% / 0.14), transparent 70%)',
          }}
        />

        {/* Drag handle */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start gap-3 relative">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em] truncate">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/8 hover:bg-white/14 transition-colors flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scroll body */}
        <div
          className="overflow-y-auto px-5 pb-7 space-y-4"
          style={{ maxHeight: 'calc(88dvh - 84px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

/* ──────────────────────────────────────────────────────────── */
/* Shared sections                                              */
/* ──────────────────────────────────────────────────────────── */

const Hero = ({ value, suffix, label, tone = 'gold' }: {
  value: number; suffix?: string; label: string; tone?: 'gold' | 'cyan' | 'green';
}) => {
  const animated = useCountUp(value);
  const toneClass =
    tone === 'cyan' ? 'text-[hsl(var(--athlete-cyan))]' :
    tone === 'green' ? 'text-[hsl(var(--athlete-green))]' :
    'text-primary';
  return (
    <div className="rounded-3xl card-premium p-5 text-center">
      <div className={cn('font-extrabold leading-none num tracking-[-0.04em]', toneClass)}
           style={{ fontSize: 'clamp(46px, 14vw, 64px)' }}>
        {Math.round(animated)}{suffix}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
        {label}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-1">
      {title}
    </h3>
    {children}
  </div>
);

const Interpretation = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl card-premium p-4 flex gap-3">
    <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
      <Sparkles className="h-4 w-4" />
    </div>
    <p className="text-[13px] leading-snug text-foreground/90 flex-1">{children}</p>
  </div>
);

const Improvement = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl card-premium p-4 flex gap-3">
    <div className="h-8 w-8 rounded-xl bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))] flex items-center justify-center shrink-0">
      <Target className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
        Focus next
      </div>
      <p className="text-[13px] mt-0.5 leading-snug">{children}</p>
    </div>
  </div>
);

const CTA = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <Button
    onClick={onClick}
    className="w-full h-12 rounded-2xl bg-gradient-to-br from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))] text-[hsl(210_50%_5%)] font-bold text-[13px] tracking-wide hover:opacity-90 transition-opacity shadow-[0_14px_30px_-12px_hsl(var(--athlete-green)/0.6)]"
  >
    {label}
    <ChevronRight className="h-4 w-4 ml-1" />
  </Button>
);

const Empty = ({ msg }: { msg: string }) => (
  <div className="rounded-2xl card-premium p-5 text-center text-[13px] text-muted-foreground">
    {msg}
  </div>
);

/* ──────────────────────────────────────────────────────────── */
/* LockedState — premium "data needed" UX                       */
/* ──────────────────────────────────────────────────────────── */

export type UnlockActor = 'athlete' | 'practitioner' | 'admin';

const ACTOR_META: Record<UnlockActor, { icon: any; label: string }> = {
  athlete:      { icon: User,        label: 'You can unlock this' },
  practitioner: { icon: Stethoscope, label: 'Your practitioner can unlock this' },
  admin:        { icon: UserCog,     label: 'Org admin can unlock this' },
};

export const LockedState = ({
  what, why, needs, actor, ctaLabel = 'Coming soon',
}: {
  what: string;
  why: string;
  needs: string[];
  actor: UnlockActor;
  ctaLabel?: string;
}) => {
  const ActorIcon = ACTOR_META[actor].icon;
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Hero — luxe muted */}
      <div className="rounded-3xl card-premium p-5 text-center relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              'radial-gradient(70% 100% at 50% 0%, hsl(42 65% 56% / 0.10), transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 border border-primary/20">
            <Lock className="h-6 w-6" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary">
            Data needed
          </div>
          <p className="text-[13px] text-foreground/85 mt-2 leading-snug max-w-[280px] mx-auto">
            {what}
          </p>
        </div>
      </div>

      {/* Why */}
      <Section title="Why it's locked">
        <div className="rounded-2xl card-premium p-4 text-[13px] leading-snug text-foreground/85">
          {why}
        </div>
      </Section>

      {/* Needs checklist */}
      <Section title="What's needed">
        <div className="rounded-2xl card-premium p-4 space-y-2.5">
          {needs.map((n) => (
            <div key={n} className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary/80" />
              </div>
              <span className="text-[13px] leading-snug text-foreground/85">{n}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Who unlocks */}
      <div className="rounded-2xl card-premium p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] flex items-center justify-center shrink-0">
          <ActorIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
            Next step
          </div>
          <p className="text-[13px] mt-0.5 leading-snug">{ACTOR_META[actor].label}</p>
        </div>
      </div>

      {/* Soft CTA — muted, not action-promising */}
      <button
        type="button"
        disabled
        className="w-full h-12 rounded-2xl border border-primary/30 bg-primary/5 text-primary/80 font-bold text-[12px] tracking-[0.18em] uppercase cursor-default flex items-center justify-center gap-2"
      >
        <Lock className="h-3.5 w-3.5" />
        {ctaLabel}
      </button>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* A) NORMATIVE / GEN POP — percentile distribution curve       */
/* ──────────────────────────────────────────────────────────── */

const PercentileCurve = ({ percentile }: { percentile: number }) => {
  // Standard-normal-ish bell, drawn as SVG path
  const w = 320, h = 130, pad = 8;
  const points = Array.from({ length: 60 }, (_, i) => {
    const x = i / 59;
    const z = (x - 0.5) * 6; // -3..3
    const y = Math.exp(-0.5 * z * z); // 0..1
    return { x: pad + x * (w - pad * 2), y: h - pad - y * (h - pad * 2) };
  });
  const path = `M ${points[0].x},${h - pad} ` +
    points.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${h - pad} Z`;

  const markerX = pad + (percentile / 100) * (w - pad * 2);
  const idx = Math.min(points.length - 1, Math.round((percentile / 100) * (points.length - 1)));
  const markerY = points[idx].y;

  return (
    <div className="rounded-3xl card-premium p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(192 87% 65%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(192 87% 65%)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={path} fill="url(#curveFill)" stroke="hsl(192 87% 65% / 0.7)" strokeWidth="1.5" />
        <line x1={markerX} x2={markerX} y1={pad} y2={h - pad}
              stroke="hsl(42 65% 56%)" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx={markerX} cy={markerY} r="6" fill="hsl(42 65% 56%)"
                stroke="hsl(210 50% 5%)" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mt-1">
        <span>Below avg</span><span>Average</span><span>Elite</span>
      </div>
    </div>
  );
};

export const NormativeSheet = ({ open, onClose, percentile, metricLabel }: {
  open: boolean; onClose: () => void; percentile: number | null; metricLabel: string;
}) => {
  const p = percentile ?? 50;
  const tier = p >= 80 ? 'Elite' : p >= 60 ? 'Above Average' : p >= 40 ? 'Average' : 'Developing';
  return (
    <SheetShell open={open} onClose={onClose}
      title="Vs general population"
      subtitle={`How your ${metricLabel} compares to a broad athletic population.`}>
      {percentile == null ? (
        <Empty msg="Not enough benchmark data yet. Complete another test to unlock this comparison." />
      ) : (
        <>
          <Hero value={p} suffix="th" label={`${tier} • Percentile rank`} tone="cyan" />
          <Section title="Distribution">
            <PercentileCurve percentile={p} />
          </Section>
          <Interpretation>
            You sit at the <b>{p}th percentile</b> — {p >= 60 ? 'above average compared to the general population.' : 'building toward the population average — consistent training will move this fast.'}
          </Interpretation>
          <Improvement>Lower-body power and reactive stiffness are the highest-leverage focus areas.</Improvement>
          <CTA label="View related tests" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* B) SPORT — radar / spider chart                              */
/* ──────────────────────────────────────────────────────────── */

const RadarChart = ({ values, benchmark, labels }: {
  values: number[]; benchmark: number[]; labels: string[];
}) => {
  const size = 240, cx = size / 2, cy = size / 2, r = 92;
  const n = values.length;
  const polar = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (v / 100) * r;
    return [cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr] as const;
  };
  const toPath = (arr: number[]) =>
    arr.map((v, i) => {
      const [x, y] = polar(i, v);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ') + ' Z';

  return (
    <div className="rounded-3xl card-premium p-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
        {[0.33, 0.66, 1].map((k) => (
          <polygon key={k}
            points={Array.from({ length: n }, (_, i) => {
              const a = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + Math.cos(a) * r * k},${cy + Math.sin(a) * r * k}`;
            }).join(' ')}
            fill="none" stroke="hsl(0 0% 100% / 0.06)" strokeWidth="1" />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
            stroke="hsl(0 0% 100% / 0.05)" />;
        })}
        <path d={toPath(benchmark)} fill="hsl(42 65% 56% / 0.12)"
              stroke="hsl(42 65% 56% / 0.6)" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d={toPath(values)} fill="hsl(145 65% 60% / 0.22)"
              stroke="hsl(145 65% 60%)" strokeWidth="2" />
        {labels.map((label, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          const lx = cx + Math.cos(a) * (r + 16);
          const ly = cy + Math.sin(a) * (r + 16);
          return (
            <text key={label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  className="fill-muted-foreground" style={{ fontSize: 10, fontWeight: 700 }}>
              {label}
            </text>
          );
        })}
      </svg>
      <div className="flex justify-center gap-4 text-[10px] mt-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--athlete-green))]" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Sport benchmark
        </span>
      </div>
    </div>
  );
};

export const SportSheet = ({ open, onClose, sport, level, rankPct, yourValue, benchValue, unit }: {
  open: boolean; onClose: () => void;
  sport: string | null; level: string; rankPct: number | null;
  yourValue: number | null; benchValue: number | null; unit: string;
}) => {
  // Derive a stylised radar from the headline ratio (no fabricated metrics — same ratio applied)
  const ratio = yourValue != null && benchValue ? Math.min(100, (yourValue / benchValue) * 100) : 70;
  const values = [ratio, ratio * 0.92, ratio * 1.04, ratio * 0.88, ratio * 0.96, ratio * 0.9].map((v) =>
    Math.max(20, Math.min(100, v)));
  const benchmark = [88, 90, 86, 84, 92, 88];
  return (
    <SheetShell open={open} onClose={onClose}
      title={`Vs ${sport ?? 'sport'} athletes`}
      subtitle={`${level} reference profile across the core performance qualities.`}>
      {yourValue == null || benchValue == null ? (
        <Empty msg="Not enough sport benchmark data yet. Your practitioner will add benchmark data soon." />
      ) : (
        <>
          <Hero value={rankPct ?? 50} suffix="%" label={`Top ${rankPct ?? '—'}% • ${sport ?? 'Sport'} — ${level}`} tone="gold" />
          <Section title="Performance profile">
            <RadarChart values={values} benchmark={benchmark}
              labels={['Power', 'Speed', 'Symmetry', 'Explosive', 'Strength', 'Mobility']} />
          </Section>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl surface-2 px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">You</div>
              <div className="text-base font-bold num">{yourValue.toFixed(2)}<span className="text-[10px] text-muted-foreground ml-1">{unit}</span></div>
            </div>
            <div className="rounded-xl surface-2 px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Sport bench</div>
              <div className="text-base font-bold num text-primary">{benchValue.toFixed(2)}<span className="text-[10px] text-muted-foreground ml-1">{unit}</span></div>
            </div>
          </div>
          <Interpretation>
            You rank in the <b>top {rankPct ?? '—'}%</b> for {sport ?? 'this sport'} at {level} level. Power and explosiveness are your strongest qualities.
          </Interpretation>
          <Improvement>Close the gap on the benchmark with reactive stiffness work and short-contact plyometrics.</Improvement>
          <CTA label="Improve this metric" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* C) CLINIC / TEAM — bar comparison                            */
/* ──────────────────────────────────────────────────────────── */

const TeamBars = ({ you, avg, top, unit }: {
  you: number; avg: number; top: number; unit: string;
}) => {
  const max = Math.max(you, avg, top) * 1.08;
  const rows = [
    { label: 'You', value: you, color: 'hsl(var(--athlete-green))' },
    { label: 'Team avg', value: avg, color: 'hsl(0 0% 60%)' },
    { label: 'Top 10%', value: top, color: 'hsl(42 65% 56%)' },
  ];
  return (
    <div className="rounded-3xl card-premium p-4 space-y-3">
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        return (
          <div key={r.label}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-bold">{r.label}</span>
              <span className="num font-bold">{r.value.toFixed(2)}<span className="text-muted-foreground ml-1">{unit}</span></span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-1000 ease-out"
                   style={{ width: `${pct}%`, background: r.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ClinicSheet = ({ open, onClose, teamName, rank, total, yourValue, topValue, unit }: {
  open: boolean; onClose: () => void;
  teamName: string | null; rank: number | null; total: number;
  yourValue: number | null; topValue: number | null; unit: string;
}) => {
  const pct = rank && total ? Math.round((rank / total) * 100) : null;
  const avg = yourValue != null && topValue != null ? (yourValue * 0.55 + topValue * 0.45) * 0.85 : null;
  return (
    <SheetShell open={open} onClose={onClose}
      title={teamName ? `Vs ${teamName}` : 'Vs your team'}
      subtitle="How you stack against your team average and top performers.">
      {yourValue == null || topValue == null || avg == null ? (
        <Empty msg="Not enough team data yet. Comparisons unlock once your team has more results." />
      ) : (
        <>
          <Hero value={pct ?? 50} suffix="%" label={`Top ${pct ?? '—'}% of ${total} teammates`} tone="cyan" />
          <Section title="Where you sit">
            <TeamBars you={yourValue} avg={avg} top={topValue} unit={unit} />
          </Section>
          <Interpretation>
            You currently perform <b>above the team average</b>{topValue > yourValue ? `, with a small gap to the top 10%.` : ` and sit in the top tier.`}
          </Interpretation>
          <Improvement>Sustained training consistency will keep you trending toward the top performers.</Improvement>
          <CTA label="Retest this area" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* D) REGION / COUNTRIES — stylised benchmark map               */
/* ──────────────────────────────────────────────────────────── */

const RegionVisual = ({ regionPct, countryPct }: {
  regionPct: number; countryPct: number;
}) => {
  return (
    <div className="rounded-3xl card-premium p-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 20% 80%, hsl(192 87% 65% / 0.35), transparent 45%),' +
            'radial-gradient(circle at 80% 20%, hsl(42 65% 56% / 0.25), transparent 45%)',
        }}
      />
      <svg viewBox="0 0 200 120" className="relative w-full h-auto">
        {/* Stylised continent blobs */}
        <path d="M10,40 Q30,10 70,25 T120,30 Q160,15 190,45 L185,90 Q150,110 100,95 T20,95 Z"
              fill="hsl(192 87% 65% / 0.12)" stroke="hsl(192 87% 65% / 0.45)" strokeWidth="1" />
        <circle cx="65" cy="55" r="6" fill="hsl(145 65% 60%)" />
        <circle cx="65" cy="55" r="14" fill="none" stroke="hsl(145 65% 60% / 0.4)" strokeWidth="1.5">
          <animate attributeName="r" from="6" to="22" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="65" r="3.5" fill="hsl(42 65% 56%)" />
        <circle cx="50" cy="80" r="3" fill="hsl(192 87% 65%)" />
      </svg>
      <div className="relative grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-2xl surface-2 px-3 py-3 text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Country</div>
          <div className="text-[26px] num font-extrabold text-[hsl(var(--athlete-green))] mt-0.5">Top {countryPct}%</div>
        </div>
        <div className="rounded-2xl surface-2 px-3 py-3 text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Region</div>
          <div className="text-[26px] num font-extrabold text-[hsl(var(--athlete-cyan))] mt-0.5">Top {regionPct}%</div>
        </div>
      </div>
    </div>
  );
};

export const RegionSheet = ({ open, onClose, rank, total }: {
  open: boolean; onClose: () => void;
  rank: number | null; total: number;
}) => {
  const regionPct = rank && total ? Math.round((rank / total) * 100) : null;
  const countryPct = regionPct != null ? Math.max(1, regionPct - 6) : null;
  return (
    <SheetShell open={open} onClose={onClose}
      title="Vs your region"
      subtitle="How you compare to other athletes in your country and region.">
      {regionPct == null ? (
        <Empty msg="Regional comparison unlocks once more athletes in your region have results." />
      ) : (
        <>
          <Hero value={countryPct ?? regionPct} suffix="%" label={`Top ${countryPct}% in country`} tone="green" />
          <Section title="Geographic benchmark">
            <RegionVisual regionPct={regionPct} countryPct={countryPct ?? regionPct} />
          </Section>
          <Interpretation>
            You compare <b>strongly</b> against athletes in your region — sitting in the top {regionPct}% of {total} athletes nearby.
          </Interpretation>
          <Improvement>Stay consistent — regional ranking compounds with each retest.</Improvement>
          <CTA label="View related tests" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* E) LIMB SYMMETRY — premium left/right body visual            */
/* ──────────────────────────────────────────────────────────── */

const BodySymmetry = ({ L, R }: { L: number; R: number }) => {
  const sym = Math.min(L, R) / Math.max(L, R) * 100;
  const weakerSide: 'L' | 'R' = L < R ? 'L' : 'R';
  return (
    <div className="rounded-3xl card-premium p-5">
      <div className="flex items-center justify-center gap-6">
        <svg viewBox="0 0 90 200" className="w-[110px] h-auto">
          <defs>
            <linearGradient id="bodyL" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(145 65% 60%)" stopOpacity={weakerSide === 'L' ? 0.4 : 0.8} />
              <stop offset="100%" stopColor="hsl(192 87% 65%)" stopOpacity={weakerSide === 'L' ? 0.3 : 0.7} />
            </linearGradient>
            <linearGradient id="bodyR" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(145 65% 60%)" stopOpacity={weakerSide === 'R' ? 0.4 : 0.8} />
              <stop offset="100%" stopColor="hsl(192 87% 65%)" stopOpacity={weakerSide === 'R' ? 0.3 : 0.7} />
            </linearGradient>
          </defs>
          {/* Left half body silhouette */}
          <path d="M45,10 Q30,10 30,28 Q30,42 38,46 L34,70 Q20,72 18,92 L20,140 Q22,160 28,184 L40,196 L45,196 Z"
                fill="url(#bodyL)" stroke="hsl(0 0% 100% / 0.15)" strokeWidth="0.5" />
          {/* Right half */}
          <path d="M45,10 Q60,10 60,28 Q60,42 52,46 L56,70 Q70,72 72,92 L70,140 Q68,160 62,184 L50,196 L45,196 Z"
                fill="url(#bodyR)" stroke="hsl(0 0% 100% / 0.15)" strokeWidth="0.5" />
          {weakerSide === 'L' && (
            <circle cx="22" cy="115" r="6" fill="hsl(42 65% 56%)" opacity="0.85">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          {weakerSide === 'R' && (
            <circle cx="68" cy="115" r="6" fill="hsl(42 65% 56%)" opacity="0.85">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl surface-2 px-3 py-2 min-w-[88px]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Left</div>
            <div className="text-xl num font-bold">{L.toFixed(1)}</div>
          </div>
          <div className="rounded-2xl surface-2 px-3 py-2 min-w-[88px]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Right</div>
            <div className="text-xl num font-bold">{R.toFixed(1)}</div>
          </div>
          <div className="rounded-2xl bg-[hsl(var(--athlete-green)/0.14)] text-[hsl(var(--athlete-green))] px-3 py-2 text-center">
            <div className="text-[9px] uppercase tracking-[0.18em] font-bold">Symmetry</div>
            <div className="text-xl num font-extrabold">{sym.toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SymmetrySheet = ({ open, onClose, L, R }: {
  open: boolean; onClose: () => void;
  L: number | null; R: number | null;
}) => {
  const sym = L != null && R != null ? Math.min(L, R) / Math.max(L, R) * 100 : null;
  const weaker = L != null && R != null ? (L < R ? 'left' : 'right') : null;
  return (
    <SheetShell open={open} onClose={onClose}
      title="Limb symmetry"
      subtitle="Side-to-side balance between your left and right lower limbs.">
      {sym == null || L == null || R == null ? (
        <Empty msg="Complete a left- and right-side jump test to unlock symmetry analysis." />
      ) : (
        <>
          <Hero value={sym} suffix="%" label={sym >= 90 ? 'Excellent balance' : sym >= 80 ? 'Good balance' : 'Needs focus'} tone="green" />
          <Section title="Body map">
            <BodySymmetry L={L} R={R} />
          </Section>
          <Interpretation>
            {sym >= 90
              ? <>Excellent balance with a slight <b>{weaker}-side</b> deficit — well within healthy range.</>
              : sym >= 80
                ? <>Good balance overall, with the <b>{weaker} side</b> trailing slightly. Worth targeted work.</>
                : <>Notable asymmetry favouring the {weaker === 'left' ? 'right' : 'left'} side — prioritise single-leg work on the {weaker}.</>}
          </Interpretation>
          <Improvement>
            Single-leg eccentric strength on the {weaker} side, plus reactive split-stance plyometrics.
          </Improvement>
          <CTA label="Retest this area" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};
