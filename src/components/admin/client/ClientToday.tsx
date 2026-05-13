import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar, Bell, ArrowRight, Dumbbell, Flame, Sparkles,
  TrendingUp, ChevronRight, Activity, Heart, Moon, Hourglass,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useClientAssignments } from '@/components/programming/client/useClientAssignments';
import { useTemplateStructure } from '@/components/programming/assignments/useAssignments';
import { computeAdherence } from '@/components/programming/assignments/adherence';
import { useClientMetrics } from './useClientMetrics';
import { useRetestInterval, DEFAULT_RETEST_INTERVAL_DAYS } from '@/hooks/useRetestInterval';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onSectionChange?: (section: string) => void;
}

const greetingFor = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/** Premium readiness gauge — gold→teal arc on a soft track. */
const ReadinessRing = ({ score }: { score: number }) => {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative h-[140px] w-[140px] shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(42 95% 58%)" />
            <stop offset="100%" stopColor="hsl(192 92% 56%)" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} stroke="hsl(var(--athlete-edge))" strokeWidth="10" fill="none" />
        <circle
          cx="70" cy="70" r={r}
          stroke="url(#ringGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[44px] font-bold leading-none num">{Math.round(pct)}</div>
        <div className="text-[10px] mt-1 uppercase tracking-[0.2em] text-primary font-semibold">
          {pct >= 85 ? 'Optimal' : pct >= 70 ? 'Ready' : pct >= 55 ? 'Steady' : 'Recover'}
        </div>
      </div>
    </div>
  );
};

const StatTile = ({
  icon: Icon, label, value, sub, tone = 'default',
}: {
  icon: any; label: string; value: string; sub?: string;
  tone?: 'default' | 'good' | 'warn';
}) => (
  <div className="card-premium rounded-2xl px-3.5 py-3 flex flex-col gap-1 min-w-0">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
      <Icon className="h-3 w-3" />
      <span className="truncate">{label}</span>
    </div>
    <div className="text-xl font-bold num leading-tight">{value}</div>
    {sub && (
      <div className={cn(
        'text-[11px] font-semibold',
        tone === 'good' && 'text-[hsl(var(--success))]',
        tone === 'warn' && 'text-primary',
        tone === 'default' && 'text-muted-foreground',
      )}>{sub}</div>
    )}
  </div>
);

export const ClientToday = ({ onSectionChange }: Props) => {
  const { user, profile } = useAuth();
  const { data: athlete, isLoading: aLoading } = useClientAthlete();
  const { data: assignments = [] } = useClientAssignments(athlete?.id ?? null);
  const active = assignments.find((a: any) => a.status === 'active') ?? assignments[0] ?? null;
  const { data: structure } = useTemplateStructure(active?.template_id ?? null);

  const { data: nextBooking } = useQuery({
    queryKey: ['client-next-booking', athlete?.id, user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('bookings')
        .select('id, appointment_date, notes, status')
        .or(`client_id.eq.${user!.id}${athlete?.id ? `,client_id.eq.${athlete.id}` : ''}`)
        .gte('appointment_date', nowIso)
        .order('appointment_date', { ascending: true })
        .limit(1);
      return (data ?? [])[0] ?? null;
    },
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ['client-unread-notifications', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('platform_in_app_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', user!.id)
        .is('read_at', null);
      return count ?? 0;
    },
  });

  const { data: metrics } = useClientMetrics({
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  });

  const { data: retestInterval } = useRetestInterval(athlete?.team_id ?? null);
  const RETEST_DAYS = retestInterval ?? DEFAULT_RETEST_INTERVAL_DAYS;
  const { data: lastTest } = useQuery({
    queryKey: ['client-last-test-today', athlete?.name],
    enabled: !!athlete?.name,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('test_data')
        .select('test_date')
        .eq('athlete_name', athlete!.name)
        .order('test_date', { ascending: false })
        .limit(1);
      return (data ?? [])[0] ?? null;
    },
  });

  const retestStatus = useMemo(() => {
    if (!lastTest?.test_date) return null;
    const last = new Date(lastTest.test_date);
    const days = Math.floor((Date.now() - last.getTime()) / 86400_000);
    const due = days >= RETEST_DAYS;
    const dueSoon = !due && days >= RETEST_DAYS - 7;
    return { days, due, dueSoon, daysUntil: RETEST_DAYS - days, lastDate: last };
  }, [lastTest, RETEST_DAYS]);

  const requestRetest = async () => {
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
      toast.success("Request sent — your coach will be in touch.");
    } catch (e: any) {
      toast.error(e.message ?? 'Could not send request');
    }
  };

  const adherence = useMemo(() => {
    if (!active || !structure) return null;
    return computeAdherence({
      startDate: active.start_date,
      sessions: structure.sessions ?? [],
      blocks: structure.blocks ?? [],
      completionLogs: [],
      today: new Date(),
    });
  }, [active, structure]);

  const todaySession = adherence?.todaySession ?? adherence?.nextSession ?? null;
  const streak = adherence?.currentStreak ?? 0;

  const heroMetric = useMemo(() => metrics?.find((m) => m.latest) ?? null, [metrics]);
  const improvedMetricsCount = useMemo(
    () => (metrics ?? []).filter((m: any) => m.isImprovement && m.changePct).length,
    [metrics],
  );

  /** Display-only readiness — composed from streak, retest freshness & recent improvement. */
  const readiness = useMemo(() => {
    let s = 70;
    if (streak > 0) s += Math.min(streak * 2.5, 14);
    if (retestStatus?.due) s -= 18;
    else if (retestStatus?.dueSoon) s -= 6;
    if (heroMetric?.isImprovement && (heroMetric as any)?.changePct) {
      s += Math.min(Math.abs((heroMetric as any).changePct) / 2, 10);
    }
    return Math.max(28, Math.min(99, Math.round(s)));
  }, [streak, retestStatus, heroMetric]);

  const greetingName =
    athlete?.name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'there';

  /** Today's single focus — derived from session/retest/recovery state. */
  const todaysFocus = useMemo(() => {
    if (retestStatus?.due) return { title: 'Re-test due', sub: 'Lock in your latest numbers', cta: 'Book retest', section: 'bookings' as const, icon: Hourglass };
    if (todaySession) return { title: todaySession.name, sub: active?.template_name ?? 'Your programme', cta: 'Start session', section: 'programming' as const, icon: Dumbbell };
    if (active) return { title: 'Recovery day', sub: 'Move easy. Sleep deep.', cta: 'View programme', section: 'programming' as const, icon: Heart };
    return { title: 'Stay sharp', sub: 'Your coach will assign a programme soon', cta: 'View testing', section: 'testing' as const, icon: Activity };
  }, [todaySession, active, retestStatus]);

  if (aLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <header className="px-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.22em]">
          {greetingFor()}
        </p>
        <h1 className="text-[clamp(1.85rem,7vw,2.75rem)] font-bold tracking-tight mt-1 leading-[1.05]">
          {greetingName}
        </h1>
      </header>

      {/* HERO — Performance readiness card */}
      <Card className="card-premium card-glow overflow-hidden rounded-3xl border-0">
        <CardContent className="p-0">
          <div className="hero-bg relative p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Readiness
            </div>

            <div className="mt-4 flex items-center gap-5">
              <ReadinessRing score={readiness} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  Today&apos;s focus
                </div>
                <div className="text-[clamp(1.4rem,5vw,1.85rem)] font-bold leading-tight mt-1 truncate">
                  {todaysFocus.title}
                </div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {todaysFocus.sub}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                      <Flame className="h-3 w-3" /> {streak}d streak
                    </span>
                  )}
                  {improvedMetricsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] px-2.5 py-1 text-[11px] font-semibold">
                      <TrendingUp className="h-3 w-3" /> {improvedMetricsCount} on the rise
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => onSectionChange?.(todaysFocus.section)}
              className="group mt-5 w-full rounded-2xl bg-primary text-primary-foreground py-3.5 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.7)]"
            >
              <todaysFocus.icon className="h-4 w-4" />
              {todaysFocus.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recovery tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile
          icon={Heart}
          label="Recovery"
          value={`${Math.min(99, readiness + 5)}%`}
          sub={readiness >= 75 ? 'Optimal' : 'Building'}
          tone={readiness >= 75 ? 'good' : 'default'}
        />
        <StatTile
          icon={Moon}
          label="Last test"
          value={retestStatus ? `${retestStatus.days}d` : '—'}
          sub={retestStatus?.due ? 'Re-test due' : retestStatus?.dueSoon ? 'Due soon' : 'Fresh'}
          tone={retestStatus?.due ? 'warn' : retestStatus?.dueSoon ? 'warn' : 'good'}
        />
        <StatTile
          icon={Activity}
          label="Streak"
          value={streak > 0 ? `${streak}d` : '—'}
          sub={streak >= 5 ? 'On fire' : streak > 0 ? 'Keep going' : 'Start today'}
          tone={streak >= 5 ? 'good' : 'default'}
        />
      </div>

      {/* Recent test highlight */}
      {heroMetric?.latest && (
        <button
          onClick={() => onSectionChange?.('progress')}
          className="block w-full text-left"
        >
          <Card className="card-premium card-electric rounded-3xl border-0 transition-transform active:scale-[0.99]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--accent)/0.12)] flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-[hsl(var(--accent))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                  Recent test
                </p>
                <p className="text-sm font-medium truncate text-foreground">{heroMetric.spec.label}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold num text-foreground">
                    {heroMetric.latest.value.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">{heroMetric.spec.unit}</span>
                  {heroMetric.changePct != null && (
                    <span className={cn(
                      'text-[11px] font-semibold inline-flex items-center gap-0.5 ml-1',
                      heroMetric.isImprovement
                        ? 'text-[hsl(var(--success))]'
                        : 'text-destructive',
                    )}>
                      <TrendingUp className="h-3 w-3" />
                      {heroMetric.changePct > 0 ? '+' : ''}
                      {heroMetric.changePct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </button>
      )}

      {/* Retest CTA — secondary, only when due */}
      {retestStatus?.due && (
        <Card className="card-premium rounded-3xl border-0 ring-1 ring-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Hourglass className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Lock in your numbers</div>
              <p className="text-xs text-muted-foreground">
                {retestStatus.days} days since your last test.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button size="sm" className="h-8" onClick={() => onSectionChange?.('bookings')}>
                Book
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={requestRetest}>
                Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      <button
        onClick={() => onSectionChange?.('bookings')}
        className="block w-full text-left"
      >
        <Card className="card-premium rounded-3xl border-0 transition-transform active:scale-[0.99]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Upcoming
              </p>
              {nextBooking ? (
                <>
                  <p className="text-base font-semibold truncate">
                    {new Date(nextBooking.appointment_date).toLocaleDateString(undefined, {
                      weekday: 'long', day: 'numeric', month: 'short',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(nextBooking.appointment_date).toLocaleTimeString(undefined, {
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {nextBooking.notes ? ` · ${nextBooking.notes}` : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </button>

      {/* Messages teaser */}
      <button
        onClick={() => onSectionChange?.('notifications')}
        className="block w-full text-left"
      >
        <Card className="card-premium rounded-3xl border-0 transition-transform active:scale-[0.99]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 relative">
              <Bell className="h-6 w-6 text-primary" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-[18px] text-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Messages
              </p>
              <p className="text-sm font-medium">
                {unread > 0
                  ? `${unread} new message${unread === 1 ? '' : 's'}`
                  : "You're all caught up"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </button>
    </div>
  );
};
