import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Sparkles, Target, ChevronRight, Lock, Check,
  UserCog, Stethoscope, User, TrendingUp, Activity, Trophy,
  Globe2, Flame, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ──────────────────────────────────────────────────────────── */
/* Shared bottom-sheet chassis — iPhone-native, cinematic feel   */
/* ──────────────────────────────────────────────────────────── */

interface SheetShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const useCountUp = (target: number, duration = 1100, run = true) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) { setVal(target); return; }
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

const useMounted = (open: boolean, delay = 60) => {
  const [m, setM] = useState(false);
  useEffect(() => {
    if (!open) { setM(false); return; }
    const t = setTimeout(() => setM(true), delay);
    return () => clearTimeout(t);
  }, [open, delay]);
  return m;
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
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
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
          'relative w-full md:w-[404px] max-h-[90dvh] overflow-hidden',
          'rounded-t-[32px] border border-white/10 border-b-0',
          'bg-[linear-gradient(180deg,hsl(210_36%_9%/0.96),hsl(210_45%_4%/0.99))]',
          'backdrop-blur-2xl shadow-[0_-40px_100px_-10px_rgba(0,0,0,0.8)]',
          'transition-transform duration-[520ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        )}
        style={{
          transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
          marginBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Ambient aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 inset-x-0 h-64 opacity-70"
          style={{
            background:
              'radial-gradient(55% 100% at 50% 0%, hsl(42 65% 56% / 0.22), transparent 70%),' +
              'radial-gradient(60% 100% at 22% 12%, hsl(192 87% 65% / 0.18), transparent 70%),' +
              'radial-gradient(60% 100% at 82% 4%, hsl(248 68% 70% / 0.12), transparent 70%)',
          }}
        />

        {/* Drag handle */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="h-1.5 w-11 rounded-full bg-white/22" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start gap-3 relative">
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-extrabold tracking-[-0.025em] truncate leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/16 transition-colors flex items-center justify-center shrink-0 backdrop-blur"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scroll body */}
        <div
          className="overflow-y-auto px-5 pb-8 space-y-5 scroll-clean"
          style={{ maxHeight: 'calc(90dvh - 92px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

/* ──────────────────────────────────────────────────────────── */
/* Cinematic Hero — dominant numeric, three-tier label           */
/* ──────────────────────────────────────────────────────────── */

const Hero = ({
  value, suffix, kicker, status, tone = 'gold', chips,
}: {
  value: number;
  suffix?: string;
  kicker: string;           // e.g. "PERCENTILE"
  status: string;           // e.g. "Above average"
  tone?: 'gold' | 'cyan' | 'green';
  chips?: { label: string; tone?: 'gold' | 'cyan' | 'green' | 'muted' }[];
}) => {
  const animated = useCountUp(value);
  const toneText =
    tone === 'cyan' ? 'text-[hsl(var(--athlete-cyan))]' :
    tone === 'green' ? 'text-[hsl(var(--athlete-green))]' :
    'text-primary';
  const toneGlow =
    tone === 'cyan' ? 'hsl(var(--athlete-cyan) / 0.32)' :
    tone === 'green' ? 'hsl(var(--athlete-green) / 0.32)' :
    'hsl(42 65% 56% / 0.36)';
  const toneRing =
    tone === 'cyan' ? 'hsl(var(--athlete-cyan) / 0.22)' :
    tone === 'green' ? 'hsl(var(--athlete-green) / 0.22)' :
    'hsl(42 65% 56% / 0.26)';

  return (
    <div
      className="relative rounded-[28px] overflow-hidden p-7 text-center animate-fade-in"
      style={{
        background:
          'linear-gradient(160deg, hsl(0 0% 100% / 0.06), hsl(0 0% 100% / 0.015))',
        border: `1px solid ${toneRing}`,
        boxShadow:
          `0 1px 0 hsl(0 0% 100% / 0.07) inset, 0 30px 80px -24px ${toneGlow}, 0 0 0 1px ${toneRing}`,
      }}
    >
      {/* Radial glow behind number */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(60% 70% at 50% 40%, ${toneGlow}, transparent 70%)`,
        }}
      />
      {/* Slow drifting conic ring */}
      <div
        aria-hidden
        className="absolute -inset-20 pointer-events-none opacity-25"
        style={{
          background: `conic-gradient(from 140deg, transparent, ${toneGlow}, transparent 40%)`,
          filter: 'blur(40px)',
          animation: 'athlete-rotate 22s linear infinite',
        }}
      />

      <div className="relative">
        <div
          className={cn('num-hero', toneText)}
          style={{
            fontSize: 'clamp(60px, 18vw, 86px)',
            textShadow: `0 0 38px ${toneGlow}`,
          }}
        >
          {Math.round(animated)}<span className="text-[0.55em] align-top ml-1 opacity-80">{suffix}</span>
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-bold">
          {kicker}
        </div>
        <div className="mt-1.5 text-[14px] font-semibold text-foreground/90">
          {status}
        </div>
        {chips && chips.length > 0 && (
          <div className="mt-4 flex justify-center flex-wrap gap-1.5">
            {chips.map((c) => {
              const t =
                c.tone === 'cyan' ? 'bg-[hsl(var(--athlete-cyan)/0.14)] text-[hsl(var(--athlete-cyan))] border-[hsl(var(--athlete-cyan)/0.28)]' :
                c.tone === 'green' ? 'bg-[hsl(var(--athlete-green)/0.14)] text-[hsl(var(--athlete-green))] border-[hsl(var(--athlete-green)/0.28)]' :
                c.tone === 'muted' ? 'bg-white/6 text-muted-foreground border-white/10' :
                'bg-primary/14 text-primary border-primary/30';
              return (
                <span key={c.label}
                  className={cn('text-[10px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full border', t)}>
                  {c.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2.5">
    <h3 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground font-bold px-1">
      {title}
    </h3>
    {children}
  </div>
);

/* AI interpretation triplet — premium "what / why / how" */
const InsightTrio = ({
  whatMeans, whyMatters, howImprove,
}: {
  whatMeans: ReactNode;
  whyMatters: ReactNode;
  howImprove: ReactNode;
}) => {
  const rows = [
    { icon: Sparkles, label: 'What this means', body: whatMeans,
      bg: 'bg-primary/12', fg: 'text-primary', ring: 'border-primary/22' },
    { icon: Activity, label: 'Why it matters', body: whyMatters,
      bg: 'bg-[hsl(var(--athlete-cyan)/0.14)]', fg: 'text-[hsl(var(--athlete-cyan))]', ring: 'border-[hsl(var(--athlete-cyan)/0.22)]' },
    { icon: Target, label: 'How to improve', body: howImprove,
      bg: 'bg-[hsl(var(--athlete-green)/0.14)]', fg: 'text-[hsl(var(--athlete-green))]', ring: 'border-[hsl(var(--athlete-green)/0.22)]' },
  ];
  return (
    <Section title="Performance insight">
      <div className="space-y-2">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <div
              key={r.label}
              className={cn('rounded-2xl card-premium p-4 flex gap-3 border', r.ring)}
              style={{ animation: `athlete-img-in 0.55s ${0.12 + i * 0.08}s cubic-bezier(0.22,1,0.36,1) both` }}
            >
              <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', r.bg, r.fg)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9.5px] uppercase tracking-[0.22em] font-bold text-muted-foreground">
                  {r.label}
                </div>
                <p className="text-[13.5px] mt-1 leading-relaxed text-foreground/90">{r.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

const CTA = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <Button
    onClick={onClick}
    className="w-full h-12 rounded-2xl bg-gradient-to-br from-[hsl(var(--athlete-green))] to-[hsl(var(--athlete-cyan))] text-[hsl(210_50%_5%)] font-bold text-[13px] tracking-wide hover:opacity-90 transition-opacity shadow-[0_18px_36px_-14px_hsl(var(--athlete-green)/0.6)]"
  >
    {label}
    <ChevronRight className="h-4 w-4 ml-1" />
  </Button>
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
    <div className="space-y-3.5 animate-fade-in">
      {/* Hero — luxe muted */}
      <div className="rounded-[28px] card-premium p-6 text-center relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              'radial-gradient(70% 100% at 50% 0%, hsl(42 65% 56% / 0.16), transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-3 border border-primary/25 shadow-[0_0_30px_-6px_hsl(42_65%_56%/0.4)]">
            <Lock className="h-7 w-7" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.28em] font-bold text-primary">
            Data needed
          </div>
          <p className="text-[13.5px] text-foreground/85 mt-2.5 leading-relaxed max-w-[280px] mx-auto">
            {what}
          </p>
        </div>
      </div>

      <Section title="Why it's locked">
        <div className="rounded-2xl card-premium p-4 text-[13px] leading-relaxed text-foreground/85">
          {why}
        </div>
      </Section>

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
/* A) NORMATIVE / GEN POP — luminous percentile distribution    */
/* ──────────────────────────────────────────────────────────── */

const PercentileCurve = ({ percentile, mounted }: { percentile: number; mounted: boolean }) => {
  const w = 320, h = 150, pad = 10;
  const points = Array.from({ length: 80 }, (_, i) => {
    const x = i / 79;
    const z = (x - 0.5) * 6;
    const y = Math.exp(-0.5 * z * z);
    return { x: pad + x * (w - pad * 2), y: h - pad - y * (h - pad * 2 - 16) - 6 };
  });
  const path = `M ${points[0].x},${h - pad} ` +
    points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1].x},${h - pad} Z`;
  const stroke = `M ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;

  const markerX = pad + (percentile / 100) * (w - pad * 2);
  const idx = Math.min(points.length - 1, Math.round((percentile / 100) * (points.length - 1)));
  const markerY = points[idx].y;

  // Performance zones
  const zones = [
    { from: 0,  to: 40,  label: 'Developing', fill: 'hsl(0 0% 50% / 0.04)' },
    { from: 40, to: 70,  label: 'Average',    fill: 'hsl(192 87% 65% / 0.06)' },
    { from: 70, to: 100, label: 'Elite',      fill: 'hsl(42 65% 56% / 0.10)' },
  ];

  return (
    <div className="rounded-3xl card-premium p-4 relative overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(192 87% 65%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(192 87% 65%)" stopOpacity="0.04" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" /></filter>
        </defs>

        {/* Zone bands */}
        {zones.map((z) => {
          const x1 = pad + (z.from / 100) * (w - pad * 2);
          const x2 = pad + (z.to / 100) * (w - pad * 2);
          return <rect key={z.label} x={x1} y={pad} width={x2 - x1} height={h - pad * 2} fill={z.fill} />;
        })}

        <path d={path} fill="url(#curveFill)" />
        <path d={stroke} fill="none" stroke="hsl(192 87% 65%)" strokeWidth="2" filter="url(#glow)" opacity="0.7" />
        <path d={stroke} fill="none" stroke="hsl(192 87% 65%)" strokeWidth="1.5" />

        {/* Athlete marker */}
        <g
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 600ms ease-out, transform 600ms cubic-bezier(0.22,1,0.36,1)',
            transitionDelay: '420ms',
          }}
        >
          <line x1={markerX} x2={markerX} y1={pad + 6} y2={h - pad}
                stroke="hsl(42 65% 56%)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
          <circle cx={markerX} cy={markerY} r="9" fill="hsl(42 65% 56%)" opacity="0.25">
            <animate attributeName="r" values="9;14;9" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={markerX} cy={markerY} r="6" fill="hsl(42 65% 56%)"
                  stroke="hsl(210 50% 5%)" strokeWidth="2" />
        </g>
      </svg>

      {/* Zone labels */}
      <div className="flex justify-between text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-1 px-1">
        <span>Developing</span><span>Average</span><span>Elite</span>
      </div>
    </div>
  );
};

export const NormativeSheet = ({ open, onClose, percentile, metricLabel }: {
  open: boolean; onClose: () => void; percentile: number | null; metricLabel: string;
}) => {
  const mounted = useMounted(open);
  const p = percentile ?? 50;
  const tier = p >= 80 ? 'Elite' : p >= 60 ? 'Above average' : p >= 40 ? 'Average' : 'Developing';
  return (
    <SheetShell open={open} onClose={onClose}
      title="Vs general population"
      subtitle={`How your ${metricLabel} compares to a broad athletic population.`}>
      {percentile == null ? (
        <LockedState
          what="See your percentile rank against a broad athletic population, plotted on the distribution curve."
          why="We don't yet have a recent CMJ result on file for you, so we can't position you on the curve."
          needs={[
            'At least one completed Countermovement Jump test',
            'Test results synced to your athlete profile',
          ]}
          actor="athlete"
          ctaLabel="Complete a CMJ test to unlock"
        />
      ) : (
        <>
          <Hero
            value={p}
            suffix="th"
            kicker="Percentile"
            status={tier}
            tone="cyan"
            chips={[
              { label: 'Broad Population', tone: 'muted' },
              { label: metricLabel, tone: 'cyan' },
            ]}
          />
          <Section title="Distribution curve">
            <PercentileCurve percentile={p} mounted={mounted} />
          </Section>
          <InsightTrio
            whatMeans={<>You sit at the <b>{p}th percentile</b> — {p >= 60 ? 'above average compared to a broad athletic population.' : 'building toward the population average.'}</>}
            whyMatters="Higher lower-body power translates to better acceleration, jumping and change of direction."
            howImprove="Prioritise reactive strength work — short-contact plyometrics and eccentric tempo squats."
          />
          <CTA label="View related tests" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* B) SPORT — animated radar profile                            */
/* ──────────────────────────────────────────────────────────── */

const RadarChart = ({ values, benchmark, labels, mounted }: {
  values: number[]; benchmark: number[]; labels: string[]; mounted: boolean;
}) => {
  const size = 260, cx = size / 2, cy = size / 2, r = 96;
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
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(145 65% 60% / 0.10)" />
            <stop offset="100%" stopColor="hsl(145 65% 60% / 0)" />
          </radialGradient>
          <filter id="radarGlow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>

        <circle cx={cx} cy={cy} r={r} fill="url(#radarBg)" />

        {[0.33, 0.66, 1].map((k) => (
          <polygon key={k}
            points={Array.from({ length: n }, (_, i) => {
              const a = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + Math.cos(a) * r * k},${cy + Math.sin(a) * r * k}`;
            }).join(' ')}
            fill="none" stroke="hsl(0 0% 100% / 0.07)" strokeWidth="1" />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
            stroke="hsl(0 0% 100% / 0.06)" />;
        })}

        {/* Benchmark — dashed gold */}
        <g style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 700ms ease-out 200ms',
        }}>
          <path d={toPath(benchmark)} fill="hsl(42 65% 56% / 0.10)"
                stroke="hsl(42 65% 56% / 0.65)" strokeWidth="1.5" strokeDasharray="3 3" />
        </g>

        {/* You — solid mint with glow */}
        <g style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.6)',
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'opacity 650ms ease-out, transform 750ms cubic-bezier(0.22,1,0.36,1)',
          transitionDelay: '380ms',
        }}>
          <path d={toPath(values)} fill="hsl(145 65% 60%)" opacity="0.18" filter="url(#radarGlow)" />
          <path d={toPath(values)} fill="hsl(145 65% 60% / 0.25)"
                stroke="hsl(145 65% 60%)" strokeWidth="2.2" />
          {values.map((v, i) => {
            const [x, y] = polar(i, v);
            return <circle key={i} cx={x} cy={y} r="3" fill="hsl(145 65% 60%)"
                           stroke="hsl(210 50% 5%)" strokeWidth="1.5" />;
          })}
        </g>

        {labels.map((label, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          const lx = cx + Math.cos(a) * (r + 18);
          const ly = cy + Math.sin(a) * (r + 18);
          return (
            <text key={label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  className="fill-foreground/75" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>
              {label.toUpperCase()}
            </text>
          );
        })}
      </svg>
      <div className="flex justify-center gap-5 text-[10px] mt-2 font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--athlete-green))] shadow-[0_0_8px_hsl(var(--athlete-green))]" /> You
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
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
  const mounted = useMounted(open);
  const ratio = yourValue != null && benchValue ? Math.min(100, (yourValue / benchValue) * 100) : 70;
  const values = [ratio, ratio * 0.92, ratio * 1.04, ratio * 0.88, ratio * 0.96, ratio * 0.9].map((v) =>
    Math.max(20, Math.min(100, v)));
  const benchmark = [88, 90, 86, 84, 92, 88];

  return (
    <SheetShell open={open} onClose={onClose}
      title={`Vs ${sport ?? 'sport'} athletes`}
      subtitle={`${level} reference profile across the core performance qualities.`}>
      {yourValue == null || benchValue == null ? (
        <LockedState
          what={`See where you sit against elite ${sport ?? 'sport'} athletes across power, speed, symmetry, explosive, strength and mobility.`}
          why={
            sport
              ? `No matching elite benchmark data exists for ${sport} yet, so we can't build your radar profile.`
              : `Your sport isn't tagged on your athlete profile yet, so we can't match you to an elite benchmark.`
          }
          needs={[
            sport ? `Your sport tag is set (${sport})` : 'Add your sport in your athlete profile',
            `Elite benchmark row for ${sport ?? 'your sport'} in the Elite Athlete Data table`,
            'At least one of your test metrics that matches a benchmark metric',
          ]}
          actor={sport ? 'practitioner' : 'athlete'}
          ctaLabel={sport ? 'Ask practitioner to add benchmark' : 'Add your sport to unlock'}
        />
      ) : (
        <>
          <Hero
            value={rankPct ?? 50}
            suffix="%"
            kicker={`Top ranking — ${sport ?? 'Sport'}`}
            status={`${level} level reference`}
            tone="gold"
            chips={[
              { label: sport ?? 'Sport', tone: 'gold' },
              { label: level, tone: 'muted' },
              { label: 'High confidence', tone: 'green' },
            ]}
          />
          <Section title="Performance profile">
            <RadarChart
              values={values}
              benchmark={benchmark}
              mounted={mounted}
              labels={['Power', 'Speed', 'Symmetry', 'Explosive', 'Strength', 'Mobility']}
            />
          </Section>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl card-premium px-4 py-3">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">You</div>
              <div className="text-[22px] font-extrabold num text-[hsl(var(--athlete-green))] mt-0.5">
                {yourValue.toFixed(2)}
                <span className="text-[10px] text-muted-foreground ml-1 font-semibold">{unit}</span>
              </div>
            </div>
            <div className="rounded-2xl card-premium px-4 py-3">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Sport bench</div>
              <div className="text-[22px] font-extrabold num text-primary mt-0.5">
                {benchValue.toFixed(2)}
                <span className="text-[10px] text-muted-foreground ml-1 font-semibold">{unit}</span>
              </div>
            </div>
          </div>
          <InsightTrio
            whatMeans={<>You rank in the <b>top {rankPct ?? '—'}%</b> for {sport ?? 'this sport'} at {level} level.</>}
            whyMatters="Closing the gap to elite benchmarks is the clearest signal of sport-specific readiness."
            howImprove="Reactive stiffness work and short-contact plyometrics will move this fastest."
          />
          <CTA label="Improve this metric" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* C) CLINIC / TEAM — animated comparison bars                  */
/* ──────────────────────────────────────────────────────────── */

const TeamBars = ({ you, avg, top, unit, mounted }: {
  you: number; avg: number; top: number; unit: string; mounted: boolean;
}) => {
  const max = Math.max(you, avg, top) * 1.08;
  const rows = [
    { label: 'You',      value: you, color: 'linear-gradient(90deg, hsl(145 65% 60%), hsl(192 87% 65%))', accent: 'text-[hsl(var(--athlete-green))]', glow: 'hsl(var(--athlete-green) / 0.55)' },
    { label: 'Team avg', value: avg, color: 'linear-gradient(90deg, hsl(0 0% 55%), hsl(0 0% 70%))',     accent: 'text-muted-foreground',           glow: 'transparent' },
    { label: 'Top 10%',  value: top, color: 'linear-gradient(90deg, hsl(42 65% 56%), hsl(38 75% 62%))',  accent: 'text-primary',                     glow: 'hsl(42 65% 56% / 0.55)' },
  ];
  return (
    <div className="rounded-3xl card-premium p-5 space-y-4">
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        return (
          <div key={r.label}>
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="font-bold text-foreground/85">{r.label}</span>
              <span className={cn('num font-extrabold', r.accent)}>
                {r.value.toFixed(2)}<span className="text-muted-foreground ml-1 text-[10px] font-semibold">{unit}</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden relative">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  background: r.color,
                  boxShadow: `0 0 16px -2px ${r.glow}`,
                  transition: `width 1100ms cubic-bezier(0.22,1,0.36,1) ${250 + i * 140}ms`,
                }}
              />
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
  const mounted = useMounted(open);
  const pct = rank && total ? Math.round((rank / total) * 100) : null;
  const avg = yourValue != null && topValue != null ? (yourValue * 0.55 + topValue * 0.45) * 0.85 : null;
  return (
    <SheetShell open={open} onClose={onClose}
      title={teamName ? `Vs ${teamName}` : 'Vs your team'}
      subtitle="How you stack against your team average and top performers.">
      {yourValue == null || topValue == null || avg == null ? (
        <LockedState
          what={`See how you stack against your ${teamName ? teamName + ' ' : ''}teammates — average, top 10% and your position in the squad.`}
          why={
            teamName
              ? `Your team only has a small data set for this test, so a ranking would not be meaningful yet.`
              : `You are not linked to a club or team yet, so we have no squad to compare you against.`
          }
          needs={[
            teamName ? `You are linked to a team (${teamName})` : 'Get linked to a club or team',
            'At least 3 teammates with results on the same test',
            'A recent personal result for the same metric',
          ]}
          actor={teamName ? 'practitioner' : 'admin'}
          ctaLabel={teamName ? 'More teammate results needed' : 'Ask admin to link your team'}
        />
      ) : (
        <>
          <Hero
            value={pct ?? 50}
            suffix="%"
            kicker="Squad ranking"
            status={`Top ${pct ?? '—'}% of ${total} teammates`}
            tone="cyan"
            chips={[
              { label: teamName ?? 'Your team', tone: 'cyan' },
              { label: `#${rank ?? '—'} of ${total}`, tone: 'muted' },
              { label: 'Power', tone: 'green' },
            ]}
          />
          <Section title="Where you sit">
            <TeamBars you={yourValue} avg={avg} top={topValue} unit={unit} mounted={mounted} />
          </Section>
          <InsightTrio
            whatMeans={<>You currently perform <b>above the team average</b>{topValue > yourValue ? `, with a small gap to the top 10%.` : ` and sit in the top tier.`}</>}
            whyMatters="Squad ranking reflects how prepared you are versus your direct competitive group."
            howImprove="Stay consistent — top performers usually win on training adherence, not isolated sessions."
          />
          <CTA label="Retest this area" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* D) REGION / COUNTRIES — premium stylised geo card            */
/* ──────────────────────────────────────────────────────────── */

const RegionVisual = ({ regionPct, countryPct, mounted }: {
  regionPct: number; countryPct: number; mounted: boolean;
}) => {
  return (
    <div className="rounded-3xl card-premium p-5 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(circle at 22% 80%, hsl(192 87% 65% / 0.36), transparent 45%),' +
            'radial-gradient(circle at 82% 22%, hsl(42 65% 56% / 0.28), transparent 45%)',
        }}
      />

      <svg viewBox="0 0 220 120" className="relative w-full h-auto">
        <defs>
          <radialGradient id="globeGrad" cx="40%" cy="40%" r="70%">
            <stop offset="0%" stopColor="hsl(192 87% 65% / 0.22)" />
            <stop offset="100%" stopColor="hsl(210 50% 5% / 0)" />
          </radialGradient>
        </defs>

        {/* Topographic concentric rings */}
        {[14, 28, 42, 56].map((rr, i) => (
          <ellipse key={rr} cx="110" cy="60" rx={rr * 1.8} ry={rr * 0.9}
            fill="none" stroke="hsl(192 87% 65% / 0.10)" strokeWidth="0.6"
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 600ms ease-out ${100 + i * 80}ms`,
            }} />
        ))}

        {/* Continent silhouette */}
        <path d="M14,46 Q34,16 78,30 T132,34 Q176,18 206,52 L200,92 Q160,112 108,98 T22,98 Z"
              fill="url(#globeGrad)" stroke="hsl(192 87% 65% / 0.42)" strokeWidth="1" />

        {/* Athlete marker — your location */}
        <g style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0)',
          transformOrigin: '72px 58px',
          transition: 'opacity 600ms ease-out, transform 700ms cubic-bezier(0.22,1,0.36,1)',
          transitionDelay: '420ms',
        }}>
          <circle cx="72" cy="58" r="22" fill="hsl(145 65% 60% / 0.14)">
            <animate attributeName="r" values="14;28;14" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="72" cy="58" r="6" fill="hsl(145 65% 60%)"
                  stroke="hsl(210 50% 5%)" strokeWidth="2" />
        </g>

        {/* Other dots */}
        <circle cx="148" cy="68" r="3" fill="hsl(42 65% 56% / 0.7)" />
        <circle cx="54" cy="84" r="2.5" fill="hsl(192 87% 65% / 0.6)" />
        <circle cx="172" cy="44" r="2" fill="hsl(0 0% 100% / 0.35)" />
        <circle cx="96" cy="42" r="2" fill="hsl(0 0% 100% / 0.25)" />
      </svg>

      <div className="relative grid grid-cols-2 gap-2.5 mt-4">
        <div className="rounded-2xl bg-white/[0.04] border border-white/8 px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            <Globe2 className="h-3 w-3" /> Country
          </div>
          <div className="text-[28px] num font-extrabold text-[hsl(var(--athlete-green))] mt-1 leading-none">
            Top {countryPct}%
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/8 px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            <Trophy className="h-3 w-3" /> Region
          </div>
          <div className="text-[28px] num font-extrabold text-[hsl(var(--athlete-cyan))] mt-1 leading-none">
            Top {regionPct}%
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegionSheet = ({ open, onClose, rank, total }: {
  open: boolean; onClose: () => void;
  rank: number | null; total: number;
}) => {
  const mounted = useMounted(open);
  const regionPct = rank && total ? Math.round((rank / total) * 100) : null;
  const countryPct = regionPct != null ? Math.max(1, regionPct - 6) : null;
  return (
    <SheetShell open={open} onClose={onClose}
      title="Vs your region"
      subtitle="How you compare to other athletes in your country and region.">
      {regionPct == null ? (
        <LockedState
          what="See how you compare to other athletes in your country and region, plotted on a geographic benchmark."
          why="Your latest test isn't tagged with a region, or not enough nearby athletes have completed this test yet."
          needs={[
            'Test session tagged with a country / region on capture',
            'At least 3 other athletes in your region with the same test',
            'A recent personal result for the same metric',
          ]}
          actor="practitioner"
          ctaLabel="Request region tagging on next test"
        />
      ) : (
        <>
          <Hero
            value={countryPct ?? regionPct}
            suffix="%"
            kicker="National ranking"
            status={`Top ${countryPct}% in country · top ${regionPct}% regionally`}
            tone="green"
            chips={[
              { label: `#${rank} of ${total}`, tone: 'muted' },
              { label: 'Regional leader', tone: 'green' },
            ]}
          />
          <Section title="Geographic benchmark">
            <RegionVisual regionPct={regionPct} countryPct={countryPct ?? regionPct} mounted={mounted} />
          </Section>
          <InsightTrio
            whatMeans={<>You compare <b>strongly</b> against athletes in your region — sitting in the top {regionPct}% of {total} athletes nearby.</>}
            whyMatters="Regional rank is a meaningful proxy for selection, competitive depth and visibility."
            howImprove="Stay consistent — regional ranking compounds with every retest you complete."
          />
          <CTA label="View related tests" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};

/* ──────────────────────────────────────────────────────────── */
/* E) LIMB SYMMETRY — premium body map                          */
/* ──────────────────────────────────────────────────────────── */

const BodySymmetry = ({ L, R, mounted }: { L: number; R: number; mounted: boolean }) => {
  const sym = Math.min(L, R) / Math.max(L, R) * 100;
  const weakerSide: 'L' | 'R' = L < R ? 'L' : 'R';
  const weakerLabel = weakerSide === 'L' ? 'Left' : 'Right';
  const strongerLabel = weakerSide === 'L' ? 'Right' : 'Left';
  const risk = sym >= 90 ? 'Low' : sym >= 80 ? 'Moderate' : 'Elevated';
  const riskColor = sym >= 90 ? 'hsl(var(--athlete-green))' : sym >= 80 ? 'hsl(42 65% 56%)' : 'hsl(4 84% 65%)';

  return (
    <div className="rounded-3xl card-premium p-5 relative overflow-hidden">
      {/* Soft floor shadow */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 95%, hsl(192 87% 65% / 0.18), transparent 70%)',
        }}
      />

      <div className="relative flex items-center justify-center gap-5">
        <svg viewBox="0 0 110 220" className="w-[130px] h-auto"
             style={{
               opacity: mounted ? 1 : 0,
               transform: mounted ? 'translateY(0)' : 'translateY(12px)',
               transition: 'opacity 700ms ease-out, transform 700ms cubic-bezier(0.22,1,0.36,1)',
             }}>
          <defs>
            <linearGradient id="bodyStrong" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(145 65% 60%)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(192 87% 65%)" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="bodyWeak" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(42 65% 56%)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="hsl(38 75% 62%)" stopOpacity="0.3" />
            </linearGradient>
            <filter id="bodyGlow"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>

          {/* Head */}
          <circle cx="55" cy="22" r="13" fill="hsl(0 0% 100% / 0.12)" stroke="hsl(0 0% 100% / 0.15)" strokeWidth="0.5" />

          {/* Left half body silhouette */}
          <path d="M55,38 Q40,38 38,52 Q38,66 46,72 L42,98 Q26,102 24,124 L26,170 Q28,192 34,212 L46,222 L55,222 Z"
                fill={weakerSide === 'L' ? 'url(#bodyWeak)' : 'url(#bodyStrong)'}
                stroke="hsl(0 0% 100% / 0.18)" strokeWidth="0.6" />
          {/* Right half */}
          <path d="M55,38 Q70,38 72,52 Q72,66 64,72 L68,98 Q84,102 86,124 L84,170 Q82,192 76,212 L64,222 L55,222 Z"
                fill={weakerSide === 'R' ? 'url(#bodyWeak)' : 'url(#bodyStrong)'}
                stroke="hsl(0 0% 100% / 0.18)" strokeWidth="0.6" />

          {/* Weaker side glow indicator on thigh */}
          {weakerSide === 'L' && (
            <g>
              <circle cx="30" cy="135" r="12" fill="hsl(42 65% 56% / 0.4)" filter="url(#bodyGlow)" />
              <circle cx="30" cy="135" r="5" fill="hsl(42 65% 56%)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
          {weakerSide === 'R' && (
            <g>
              <circle cx="80" cy="135" r="12" fill="hsl(42 65% 56% / 0.4)" filter="url(#bodyGlow)" />
              <circle cx="80" cy="135" r="5" fill="hsl(42 65% 56%)">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* L / R labels */}
          <text x="20" y="116" className="fill-muted-foreground" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em' }}>L</text>
          <text x="86" y="116" className="fill-muted-foreground" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em' }}>R</text>
        </svg>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="rounded-2xl bg-white/[0.04] border border-white/8 px-3 py-2 min-w-[96px]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Left</div>
            <div className="text-[19px] num font-extrabold">{L.toFixed(1)}</div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/8 px-3 py-2 min-w-[96px]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Right</div>
            <div className="text-[19px] num font-extrabold">{R.toFixed(1)}</div>
          </div>
          <div
            className="rounded-2xl px-3 py-2 text-center border"
            style={{
              background: `${riskColor.replace(')', ' / 0.14)')}`,
              color: riskColor,
              borderColor: riskColor.replace(')', ' / 0.28)'),
            }}
          >
            <div className="flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-[0.18em] font-bold">
              <ShieldCheck className="h-3 w-3" /> Risk
            </div>
            <div className="text-[15px] font-extrabold mt-0.5">{risk}</div>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between text-[11px] px-1">
        <div className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-[hsl(var(--athlete-green))]" />
          <span className="text-muted-foreground">Stronger</span>
          <span className="font-bold">{strongerLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold">{weakerLabel}</span>
          <span className="text-muted-foreground">Focus side</span>
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
};

export const SymmetrySheet = ({ open, onClose, L, R }: {
  open: boolean; onClose: () => void;
  L: number | null; R: number | null;
}) => {
  const mounted = useMounted(open);
  const sym = L != null && R != null ? Math.min(L, R) / Math.max(L, R) * 100 : null;
  const weaker = L != null && R != null ? (L < R ? 'left' : 'right') : null;
  return (
    <SheetShell open={open} onClose={onClose}
      title="Limb symmetry"
      subtitle="Side-to-side balance between your left and right lower limbs.">
      {sym == null || L == null || R == null ? (
        <LockedState
          what="See your left vs right limb balance on a premium body map, with a symmetry score and focus side."
          why="We need both a left-side and right-side single-leg CMJ on file to calculate your symmetry."
          needs={[
            'One Left-Side Countermovement Jump test result',
            'One Right-Side Countermovement Jump test result',
            'Tests captured within the same training block (for relevance)',
          ]}
          actor="athlete"
          ctaLabel="Complete L/R CMJ to unlock"
        />
      ) : (
        <>
          <Hero
            value={sym}
            suffix="%"
            kicker="Balance score"
            status={sym >= 90 ? 'Excellent balance' : sym >= 80 ? 'Good balance' : 'Needs focus'}
            tone="green"
            chips={[
              { label: `Focus: ${weaker}`, tone: 'gold' },
              { label: sym >= 90 ? 'Low injury risk' : sym >= 80 ? 'Moderate risk' : 'Elevated risk',
                tone: sym >= 90 ? 'green' : 'gold' },
            ]}
          />
          <Section title="Body map">
            <BodySymmetry L={L} R={R} mounted={mounted} />
          </Section>
          <InsightTrio
            whatMeans={
              sym >= 90
                ? <>Excellent balance with a slight <b>{weaker}-side</b> deficit — well within healthy range.</>
                : sym >= 80
                  ? <>Good balance overall, with the <b>{weaker} side</b> trailing slightly. Worth targeted work.</>
                  : <>Notable asymmetry favouring the {weaker === 'left' ? 'right' : 'left'} side — prioritise single-leg work on the {weaker}.</>
            }
            whyMatters="Asymmetry above ~15% is associated with elevated injury risk and reduced power transfer."
            howImprove={<>Single-leg eccentric strength on the <b>{weaker}</b> side, plus reactive split-stance plyometrics.</>}
          />
          <CTA label="Start corrective programme" onClick={onClose} />
        </>
      )}
    </SheetShell>
  );
};
