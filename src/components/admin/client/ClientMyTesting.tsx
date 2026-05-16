import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, ArrowUpRight, ArrowDownRight, Minus,
  CalendarClock, ChevronRight, Hourglass, Trophy, Users,
  MapPin, Globe, Scale, Dumbbell, Star, Flame,
} from 'lucide-react';

/** Count-up hook for premium numeric reveal. */
const useCountUp = (target: number, duration = 900) => {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      // easeOutCubic
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

/** Performance status arc — gold→cyan→green sweep, matches Home ring language. */
const PerformanceArc = ({ pct, label }: { pct: number; label: string }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - safe / 100);
  const animated = useCountUp(safe);
  return (
    <div className="relative h-[108px] w-[108px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="perfArc" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(145 65% 60%)" />
            <stop offset="55%" stopColor="hsl(192 87% 65%)" />
            <stop offset="100%" stopColor="hsl(42 65% 56%)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} stroke="hsl(0 0% 100% / 0.06)" strokeWidth="9" fill="none" />
        <circle
          cx="60" cy="60" r={r}
          stroke="url(#perfArc)" strokeWidth="9" strokeLinecap="round" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num-hero text-[30px] leading-none">{Math.round(animated)}</div>
        <div className="text-[8px] mt-1 uppercase tracking-[0.2em] text-[hsl(var(--athlete-green))] font-bold">
          {label}
        </div>
      </div>
    </div>
  );
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useRetestInterval, DEFAULT_RETEST_INTERVAL_DAYS } from '@/hooks/useRetestInterval';
import { useClientMetrics, useClientRankings } from './useClientMetrics';
import { useEliteBenchmarkForAthlete } from '@/hooks/useEliteBenchmarkForAthlete';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TabKey = 'overview' | 'comparisons' | 'history';

/* ─────────────────────────── primitives ─────────────────────────── */

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

const TrendChip = ({
  changePct, isImprovement,
}: { changePct: number | null; isImprovement: boolean | null }) => {
  if (changePct == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">
        <Minus className="h-3 w-3" /> baseline
      </span>
    );
  }
  const Icon = isImprovement ? ArrowUpRight : isImprovement === false ? ArrowDownRight : Minus;
  const tone = isImprovement
    ? 'bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]'
    : isImprovement === false
      ? 'bg-destructive/15 text-destructive'
      : 'bg-muted/40 text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold num', tone)}>
      <Icon className="h-3 w-3" />
      {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
    </span>
  );
};

const interpretMetric = (short: string, isImprovement: boolean | null) => {
  const verb =
    isImprovement === true ? 'improving' :
    isImprovement === false ? 'needs focus' : 'building baseline';
  switch (short) {
    case 'cmj_h': return `Explosiveness ${verb}`;
    case 'cmj_rsi': return `Reactive strength ${verb}`;
    case 'imtp_pf': return `Max strength ${verb}`;
    case 'pogo_rsi': return `Stiffness ${verb}`;
    default: return `Performance ${verb}`;
  }
};

/* ─────────────────────────── OVERVIEW ─────────────────────────── */

const OverviewTab = ({
  athleteName, lastTest, retestStatus, onBookRetest, onRequestRetest,
}: {
  athleteName: string | null;
  lastTest: { test_date: string; test_name: string; test_location?: string | null } | null;
  retestStatus: { days: number; due: boolean; dueSoon: boolean; daysUntil: number } | null;
  onBookRetest: () => void;
  onRequestRetest: () => void;
}) => {
  const { data: athlete } = useClientAthlete();
  const { data: metrics, isLoading } = useClientMetrics({
    athleteId: athlete?.id ?? null,
    athleteName,
    teamName: null,
  });

  const sportLabel = sportComparisonLabel(athlete?.sports as string[] | null);

  const sortedByImprovement = useMemo(
    () =>
      [...(metrics ?? [])].sort((a, b) =>
        Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0),
      ),
    [metrics],
  );
  const biggestWin = sortedByImprovement.find((m) => m.isImprovement && (m.changePct ?? 0) > 0) ?? null;
  const strongest = (metrics ?? []).find((m) => m.latest) ?? null;

  // Derive a 0–100 performance status — improvement weight + fresh test weight
  const improvedCount = (metrics ?? []).filter((m: any) => m.isImprovement).length;
  const totalWithChange = (metrics ?? []).filter((m: any) => m.changePct != null).length;
  const improvementRatio = totalWithChange > 0 ? improvedCount / totalWithChange : 0.6;
  const freshness = retestStatus?.due ? 0.5 : retestStatus?.dueSoon ? 0.75 : 1;
  const perfPct = Math.round(Math.max(28, Math.min(99, 55 + improvementRatio * 35 + (freshness - 0.5) * 10)));
  const status =
    perfPct >= 80 ? { label: 'Peak', tone: 'text-[hsl(var(--athlete-green))]' } :
    perfPct >= 65 ? { label: 'Ready', tone: 'text-[hsl(var(--athlete-cyan))]' } :
    perfPct >= 50 ? { label: 'Improving', tone: 'text-primary' } :
    { label: 'Needs Focus', tone: 'text-destructive' };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Performance status hero */}
      <Card className="card-premium card-glow rounded-3xl border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="hero-bg p-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Performance status
                </div>
                <div className={cn('text-[11px] uppercase tracking-[0.2em] font-bold mt-2.5', status.tone)}>
                  {status.label}
                </div>
                <h2 className="mt-1 text-[clamp(1.15rem,5.2vw,1.5rem)] font-bold leading-[1.1] tracking-[-0.02em]">
                  {biggestWin ? `You're trending up.` : strongest ? `Holding the line.` : `Ready to test.`}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{sportLabel}</p>
              </div>
              <PerformanceArc pct={perfPct} label={status.label} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                  Last test
                </div>
                <div className="text-base font-bold mt-0.5 truncate">
                  {lastTest?.test_date
                    ? new Date(lastTest.test_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                    : '—'}
                </div>
                {lastTest?.test_name && (
                  <div className="text-[11px] text-muted-foreground truncate">{lastTest.test_name}</div>
                )}
              </div>

              <div className="rounded-2xl surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                  Biggest win
                </div>
                {biggestWin && biggestWin.changePct != null ? (
                  <>
                    <div className="text-base font-bold mt-0.5 truncate text-[hsl(var(--success))] num">
                      +{biggestWin.changePct.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{biggestWin.spec.label}</div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-bold mt-0.5 text-muted-foreground">—</div>
                    <div className="text-[11px] text-muted-foreground">After your next retest</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics grid */}
      <section className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-1">
          Key metrics
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (metrics?.length ?? 0) === 0 ? (
          <Card className="card-premium rounded-2xl border-0">
            <CardContent className="p-5 text-sm text-muted-foreground">
              No tests on record yet — your first numbers will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metrics!.map((m) => (
              <Card key={m.spec.short} className="card-premium rounded-2xl border-0">
                <CardContent className="p-3.5 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold truncate">
                      {m.spec.label}
                    </span>
                    <TrendChip changePct={m.changePct} isImprovement={m.isImprovement} />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[26px] font-bold num leading-none">
                      {m.latest ? m.latest.value.toFixed(2) : '—'}
                    </span>
                    {m.spec.unit && (
                      <span className="text-[11px] text-muted-foreground">{m.spec.unit}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.latest ? interpretMetric(m.spec.short, m.isImprovement) : 'Awaiting first result'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Retest card */}
      <Card className={cn(
        'card-premium rounded-3xl border-0',
        retestStatus?.due && 'card-glow',
      )}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn(
            'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0',
            retestStatus?.due ? 'bg-primary/15 text-primary' : 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]',
          )}>
            {retestStatus?.due ? <Hourglass className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">
              {retestStatus?.due
                ? 'Re-test due — lock in your numbers'
                : retestStatus?.dueSoon
                  ? `Re-test in ${retestStatus.daysUntil} days`
                  : retestStatus
                    ? 'Progressing well'
                    : 'Awaiting first test'}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {retestStatus
                ? `${retestStatus.days} days since last test`
                : 'Book a session to start your baseline'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" className="h-8 rounded-xl" onClick={onBookRetest}>Book</Button>
            {retestStatus?.due && (
              <Button size="sm" variant="ghost" className="h-7 text-[11px] rounded-xl" onClick={onRequestRetest}>
                Request
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─────────────────────────── COMPARISONS ─────────────────────────── */

const RankBadge = ({ rank, total }: { rank: number | null; total: number }) => {
  if (!rank || total === 0) return null;
  const pct = Math.round((rank / total) * 100);
  const tone =
    pct <= 10 ? 'text-primary' :
    pct <= 25 ? 'text-[hsl(var(--accent))]' :
    pct <= 50 ? 'text-[hsl(var(--success))]' :
    'text-muted-foreground';
  return (
    <div className={cn('text-right shrink-0', tone)}>
      <div className="text-[10px] uppercase tracking-[0.16em] font-semibold opacity-80">Top</div>
      <div className="text-2xl font-bold num leading-none">{pct}%</div>
    </div>
  );
};

const ComparisonCard = ({
  icon: Icon, label, sub, rank, total, yourValue, topValue, unit, tone = 'default', onOpen,
}: {
  icon: any;
  label: string;
  sub: string;
  rank: number | null;
  total: number;
  yourValue: number | null;
  topValue: number | null;
  unit: string;
  tone?: 'default' | 'gold' | 'electric';
  onOpen?: () => void;
}) => (
  <Card
    onClick={onOpen}
    className={cn(
      'card-premium rounded-3xl border-0 cursor-pointer transition-transform active:scale-[0.99]',
      tone === 'gold' && 'card-glow',
      tone === 'electric' && 'card-electric',
    )}
  >
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0',
          tone === 'gold' ? 'bg-primary/15 text-primary' :
          tone === 'electric' ? 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]' :
          'bg-muted/40 text-muted-foreground',
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {label}
          </div>
          <div className="text-sm font-semibold truncate mt-0.5">{sub}</div>
        </div>
        <RankBadge rank={rank} total={total} />
      </div>

      {(yourValue != null || topValue != null) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl surface-2 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">You</div>
            <div className="text-base font-bold num">
              {yourValue != null ? yourValue.toFixed(2) : '—'}
              <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
            </div>
          </div>
          <div className="rounded-xl surface-2 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Top</div>
            <div className="text-base font-bold num text-primary">
              {topValue != null ? topValue.toFixed(2) : '—'}
              <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer">
        <span className="uppercase tracking-[0.18em]">View details</span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </CardContent>
  </Card>
);

type SheetKey = 'normative' | 'sport' | 'clinic' | 'region' | 'symmetry' | null;

const ComparisonsTab = ({ athleteName, teamName }: { athleteName: string | null; teamName: string | null }) => {
  const { data: athlete } = useClientAthlete();
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const { data: rankings, isLoading } = useClientRankings({
    athleteId: athlete?.id ?? null,
    athleteName,
    teamName,
  });
  const sports = (athlete?.sports as string[] | null) ?? null;
  const { data: elite } = useEliteBenchmarkForAthlete(sports);

  // Pick the headline metric (CMJ jump height) to surface across each scope
  const SHORT = 'cmj_h';
  const club = rankings?.find((r) => r.spec.short === SHORT && r.scope === 'club');
  const region = rankings?.find((r) => r.spec.short === SHORT && r.scope === 'region');
  const global = rankings?.find((r) => r.spec.short === SHORT && r.scope === 'global');

  // Limb symmetry — best left/right CMJ jump height
  const { data: symmetry } = useQuery({
    queryKey: ['client-symmetry', athleteName],
    enabled: !!athleteName,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('test_data')
        .select('test_name, metrics')
        .eq('athlete_name', athleteName!)
        .in('test_name', ['Left Side Countermovement Jump', 'Right Side Countermovement Jump'])
        .order('test_date', { ascending: false })
        .limit(40);
      const pickBest = (n: string) => {
        const vals = (data ?? [])
          .filter((r: any) => r.test_name === n)
          .map((r: any) => Number((r.metrics as any)?.jump_height_ft ?? (r.metrics as any)?.jump_height))
          .filter((v) => Number.isFinite(v));
        return vals.length ? Math.max(...vals) : null;
      };
      const L = pickBest('Left Side Countermovement Jump');
      const R = pickBest('Right Side Countermovement Jump');
      if (L == null || R == null) return null;
      const diffPct = Math.abs(L - R) / Math.max(L, R) * 100;
      return { L, R, diffPct, balanced: diffPct < 10 };
    },
  });

  const eliteRow = elite?.[0];
  const eliteValue = eliteRow?.cmj_jump_height_cm ?? null;
  const yourValue = global?.yourValue ?? null;
  const eliteRankPct = (eliteValue != null && yourValue != null)
    ? Math.max(1, Math.min(99, Math.round((eliteValue - yourValue) / eliteValue * 100)))
    : null;

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-end justify-between px-1">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          You vs the field
        </h3>
        <span className="text-[10px] text-muted-foreground">CMJ Jump Height</span>
      </div>

      {/* Sport (elite normative) */}
      {eliteRow && eliteValue != null && yourValue != null && (
        <ComparisonCard
          icon={Trophy}
          label="Sport benchmark"
          sub={`Elite ${eliteRow.sport} reference`}
          rank={eliteRankPct}
          total={100}
          yourValue={yourValue}
          topValue={eliteValue}
          unit="cm"
          tone="gold"
          onOpen={() => setOpenSheet('sport')}
        />
      )}

      {/* Club / Team */}
      {club && (
        <ComparisonCard
          icon={Users}
          label="Your club"
          sub={teamName ?? 'Club ranking'}
          rank={club.rank}
          total={club.totalAthletes}
          yourValue={club.yourValue}
          topValue={club.topValue}
          unit="cm"
          tone="electric"
          onOpen={() => setOpenSheet('clinic')}
        />
      )}

      {/* Region */}
      {region && (
        <ComparisonCard
          icon={MapPin}
          label="Your region"
          sub="Regional ranking"
          rank={region.rank}
          total={region.totalAthletes}
          yourValue={region.yourValue}
          topValue={region.topValue}
          unit="cm"
          onOpen={() => setOpenSheet('region')}
        />
      )}

      {/* Global / normative */}
      {global && (
        <ComparisonCard
          icon={Globe}
          label="Global pool"
          sub="All athletes worldwide"
          rank={global.rank}
          total={global.totalAthletes}
          yourValue={global.yourValue}
          topValue={global.topValue}
          unit="cm"
          onOpen={() => setOpenSheet('normative')}
        />
      )}

      {/* Limb symmetry */}
      <Card
        onClick={() => setOpenSheet('symmetry')}
        className={cn(
          'card-premium rounded-3xl border-0 cursor-pointer transition-transform active:scale-[0.99]',
          symmetry?.balanced && 'card-electric',
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                Limb symmetry
              </div>
              <div className="text-sm font-semibold truncate mt-0.5">
                {symmetry
                  ? symmetry.balanced
                    ? 'Left/right balance is strong'
                    : `${symmetry.diffPct.toFixed(1)}% asymmetry — focus area`
                  : 'No left/right CMJ data yet'}
              </div>
            </div>
          </div>
          {symmetry && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl surface-2 px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Left</div>
                <div className="text-base font-bold num">{symmetry.L.toFixed(2)}<span className="text-[10px] text-muted-foreground ml-1">cm</span></div>
              </div>
              <div className="rounded-xl surface-2 px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Right</div>
                <div className="text-base font-bold num">{symmetry.R.toFixed(2)}<span className="text-[10px] text-muted-foreground ml-1">cm</span></div>
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="uppercase tracking-[0.18em]">View details</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {!club && !region && !global && (
        <Card className="card-premium rounded-2xl border-0">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Comparisons unlock after your first test.
          </CardContent>
        </Card>
      )}

      {/* Premium detail sheets */}
      <NormativeSheet
        open={openSheet === 'normative'}
        onClose={() => setOpenSheet(null)}
        percentile={global ? Math.max(1, 100 - Math.round((global.rank / Math.max(1, global.totalAthletes)) * 100)) : null}
        metricLabel="CMJ jump height"
      />
      <SportSheet
        open={openSheet === 'sport'}
        onClose={() => setOpenSheet(null)}
        sport={eliteRow?.sport ?? (sports?.[0] ?? null)}
        level="Pro"
        rankPct={eliteRankPct}
        yourValue={yourValue}
        benchValue={eliteValue}
        unit="cm"
      />
      <ClinicSheet
        open={openSheet === 'clinic'}
        onClose={() => setOpenSheet(null)}
        teamName={teamName}
        rank={club?.rank ?? null}
        total={club?.totalAthletes ?? 0}
        yourValue={club?.yourValue ?? null}
        topValue={club?.topValue ?? null}
        unit="cm"
      />
      <RegionSheet
        open={openSheet === 'region'}
        onClose={() => setOpenSheet(null)}
        rank={region?.rank ?? null}
        total={region?.totalAthletes ?? 0}
      />
      <SymmetrySheet
        open={openSheet === 'symmetry'}
        onClose={() => setOpenSheet(null)}
        L={symmetry?.L ?? null}
        R={symmetry?.R ?? null}
      />
    </div>
  );
};

/* ─────────────────────────── HISTORY ─────────────────────────── */

interface SessionRow {
  date: string;
  tests: string[];
  metrics: Record<string, number>;
}

const HistoryTab = ({ athleteName }: { athleteName: string | null }) => {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['client-test-sessions', athleteName],
    enabled: !!athleteName,
    staleTime: 60_000,
    queryFn: async (): Promise<SessionRow[]> => {
      const { data } = await supabase
        .from('test_data')
        .select('test_date, test_name, metrics')
        .eq('athlete_name', athleteName!)
        .order('test_date', { ascending: false })
        .limit(400);
      const grouped = new Map<string, SessionRow>();
      (data ?? []).forEach((r: any) => {
        if (!r.test_date) return;
        const existing = grouped.get(r.test_date) ?? { date: r.test_date, tests: [], metrics: {} };
        if (!existing.tests.includes(r.test_name)) existing.tests.push(r.test_name);
        // capture CMJ jump height + IMTP peak force as headline numbers
        const m = r.metrics ?? {};
        if (r.test_name === 'Countermovement Jump') {
          const v = Number(m.jump_height_ft ?? m.jump_height);
          if (Number.isFinite(v)) existing.metrics['cmj'] = v;
        }
        if (r.test_name?.includes('IMTP') || r.test_name?.includes('Mid-Thigh')) {
          const v = Number(m.force_peak ?? m.peak_force);
          if (Number.isFinite(v)) existing.metrics['imtp'] = v;
        }
        grouped.set(r.test_date, existing);
      });
      return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card className="card-premium rounded-3xl border-0 animate-fade-in">
        <CardContent className="p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
          <div className="mt-3 font-semibold">No tests yet</div>
          <p className="text-sm text-muted-foreground mt-1">
            Your timeline of testing sessions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-1">
        Your testing timeline
      </h3>
      {sessions.map((s, idx) => {
        const prev = sessions[idx + 1];
        const cmjDelta = (s.metrics.cmj != null && prev?.metrics.cmj != null)
          ? ((s.metrics.cmj - prev.metrics.cmj) / Math.abs(prev.metrics.cmj)) * 100
          : null;
        const isLatest = idx === 0;
        // Personal best in CMJ across the timeline
        const isPB = s.metrics.cmj != null &&
          sessions.every((o, i) => i === idx || o.metrics.cmj == null || o.metrics.cmj <= s.metrics.cmj!);
        const isImproving = cmjDelta != null && cmjDelta > 0.5;
        return (
          <Card key={s.date} className={cn(
            'card-premium rounded-3xl border-0 relative overflow-hidden',
            isLatest && 'card-glow',
          )}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 font-bold num',
                  isLatest ? 'bg-primary/15 text-primary' :
                  isPB ? 'bg-[hsl(var(--athlete-green)/0.15)] text-[hsl(var(--athlete-green))]' :
                  'bg-muted/40 text-muted-foreground',
                )}>
                  {isLatest ? <Star className="h-5 w-5" /> : isPB ? <Trophy className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold">
                      {new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Latest</span>
                    )}
                    {cmjDelta != null && (
                      <TrendChip changePct={cmjDelta} isImprovement={cmjDelta > 0.5 ? true : cmjDelta < -0.5 ? false : null} />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {s.tests.length} test{s.tests.length === 1 ? '' : 's'} · {s.tests.slice(0, 2).join(' · ')}
                    {s.tests.length > 2 ? ` +${s.tests.length - 2}` : ''}
                  </p>
                  {/* Achievement chips */}
                  {(isPB || isImproving) && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {isPB && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--athlete-green)/0.14)] text-[hsl(var(--athlete-green))] px-2 py-0.5 text-[10px] font-bold">
                          <Trophy className="h-3 w-3" /> Personal best
                        </span>
                      )}
                      {isImproving && !isPB && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] px-2 py-0.5 text-[10px] font-bold">
                          <Flame className="h-3 w-3" /> Improving
                        </span>
                      )}
                    </div>
                  )}
                  {(s.metrics.cmj != null || s.metrics.imtp != null) && (
                    <div className="mt-2.5 flex gap-2 flex-wrap">
                      {s.metrics.cmj != null && (
                        <span className="inline-flex items-baseline gap-1 rounded-lg surface-2 px-2.5 py-1">
                          <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">CMJ</span>
                          <span className="text-sm font-bold num">{s.metrics.cmj.toFixed(1)}</span>
                          <span className="text-[10px] text-muted-foreground">cm</span>
                        </span>
                      )}
                      {s.metrics.imtp != null && (
                        <span className="inline-flex items-baseline gap-1 rounded-lg surface-2 px-2.5 py-1">
                          <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">IMTP</span>
                          <span className="text-sm font-bold num">{Math.round(s.metrics.imtp)}</span>
                          <span className="text-[10px] text-muted-foreground">N</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/* ─────────────────────────── SHELL ─────────────────────────── */

export const ClientMyTesting = () => {
  const { user } = useAuth();
  const { data: athlete } = useClientAthlete();
  const { data: retestInterval } = useRetestInterval(athlete?.team_id ?? null);
  const RETEST_DAYS = retestInterval ?? DEFAULT_RETEST_INTERVAL_DAYS;
  const [tab, setTab] = useState<TabKey>('overview');

  const { data: lastTest } = useQuery({
    queryKey: ['client-last-test', athlete?.name],
    enabled: !!athlete?.name,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('test_data')
        .select('test_date, test_name, test_location, team_name')
        .eq('athlete_name', athlete!.name)
        .order('test_date', { ascending: false })
        .limit(1);
      return (data ?? [])[0] ?? null;
    },
  });

  const retestStatus = useMemo(() => {
    if (!lastTest?.test_date) return null;
    const last = new Date(lastTest.test_date);
    const days = Math.floor((Date.now() - last.getTime()) / 86_400_000);
    return {
      days,
      due: days >= RETEST_DAYS,
      dueSoon: days < RETEST_DAYS && days >= RETEST_DAYS - 7,
      daysUntil: Math.max(0, RETEST_DAYS - days),
    };
  }, [lastTest, RETEST_DAYS]);

  const handleBookRetest = () => {
    // Surface intent — bookings tab is reachable from the More menu.
    toast.message('Open Bookings to schedule your retest', {
      description: 'Tap More → Bookings to pick a slot with your coach.',
    });
  };

  const handleRequestRetest = async () => {
    if (!user?.id || !athlete) return;
    try {
      await supabase.from('platform_in_app_notifications').insert({
        recipient_user_id: user.id,
        team_id: athlete.team_id,
        title: '⏳ Retest requested',
        message: `${athlete.name} requested a retest. Your coach has been notified.`,
        severity: 'info',
        metadata: { notification_type: 'retest_due', source: 'client_request', athlete_id: athlete.id },
      });
      await supabase.functions.invoke('notify-practitioners-of-client-event', {
        body: {
          athlete_id: athlete.id,
          event_type: 'retest_request',
          title: '⏳ Retest requested',
          message: `${athlete.name} requested a retest.`,
          metadata: { days_since_last_test: retestStatus?.days ?? null },
        },
      });
      toast.success('Request sent — your coach will be in touch.');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not send request');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in min-w-0 max-w-full">
      <header className="px-1 pt-1 min-w-0">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.22em]">
          Performance lab
        </p>
        <h1
          className="font-extrabold tracking-[-0.04em] mt-1 leading-[1.05] truncate"
          style={{ fontSize: 'clamp(22px, 7vw, 28px)' }}
        >
          Testing
        </h1>
      </header>

      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'comparisons', label: 'Compare' },
          { key: 'history', label: 'History' },
        ]}
      />

      {tab === 'overview' && (
        <OverviewTab
          athleteName={athlete?.name ?? null}
          lastTest={lastTest ?? null}
          retestStatus={retestStatus}
          onBookRetest={handleBookRetest}
          onRequestRetest={handleRequestRetest}
        />
      )}
      {tab === 'comparisons' && (
        <ComparisonsTab
          athleteName={athlete?.name ?? null}
          teamName={(lastTest as any)?.team_name ?? null}
        />
      )}
      {tab === 'history' && <HistoryTab athleteName={athlete?.name ?? null} />}
    </div>
  );
};
