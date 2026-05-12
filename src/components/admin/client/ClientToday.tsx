import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Calendar, Bell, ArrowRight, Dumbbell, Trophy, Hourglass, Flame, Sparkles,
  TrendingUp, ChevronRight,
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
    return { days, due, dueSoon, daysUntil: RETEST_DAYS - days };
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

  const greetingName =
    athlete?.name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'there';

  if (aLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <header className="px-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {greetingFor()}
        </p>
        <h1 className="text-3xl font-bold tracking-tight mt-0.5">
          {greetingName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {todaySession ? "Here's your focus for today." : "Take a moment to check in."}
        </p>
      </header>

      {/* Retest banner — high priority */}
      {retestStatus?.due && (
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/[0.02] overflow-hidden animate-scale-in">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Hourglass className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Time to re-test</div>
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

      {/* HERO — Today's session */}
      <button
        onClick={() => onSectionChange?.('programming')}
        className="block w-full text-left group"
      >
        <Card className="overflow-hidden border-0 shadow-lg shadow-primary/10 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground transition-transform active:scale-[0.99]">
          <CardContent className="p-6 relative">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-white/5 blur-xl" />

            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
                <Dumbbell className="h-3.5 w-3.5" />
                {todaySession ? "Today's session" : 'Your programme'}
              </div>

              {todaySession ? (
                <>
                  <h2 className="text-2xl font-bold mt-2 leading-tight">{todaySession.name}</h2>
                  <p className="text-sm opacity-90 mt-1">
                    {active?.template_name}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-semibold">
                      Start session
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    {streak > 0 && (
                      <div className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <Flame className="h-4 w-4" />
                        {streak} day{streak === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                </>
              ) : active ? (
                <>
                  <h2 className="text-2xl font-bold mt-2">Recovery day</h2>
                  <p className="text-sm opacity-90 mt-1">
                    Nothing scheduled — rest well.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mt-2">No programme yet</h2>
                  <p className="text-sm opacity-90 mt-1">
                    Your coach will assign one soon.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </button>

      {/* Recent win */}
      {heroMetric?.latest && (
        <button
          onClick={() => onSectionChange?.('progress')}
          className="block w-full text-left"
        >
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent transition-transform active:scale-[0.99]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
                  Recent result
                </p>
                <p className="text-sm font-medium truncate">{heroMetric.spec.label}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold tabular-nums">
                    {heroMetric.latest.value.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">{heroMetric.spec.unit}</span>
                  {heroMetric.changePct != null && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'h-5 text-[10px] gap-0.5 font-semibold',
                        heroMetric.isImprovement
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
                      )}
                    >
                      <TrendingUp className="h-2.5 w-2.5" />
                      {heroMetric.changePct > 0 ? '+' : ''}
                      {heroMetric.changePct.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </button>
      )}

      {/* Next booking */}
      <button
        onClick={() => onSectionChange?.('bookings')}
        className="block w-full text-left"
      >
        <Card className="transition-transform active:scale-[0.99]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next session
              </p>
              {nextBooking ? (
                <>
                  <p className="text-base font-semibold">
                    {new Date(nextBooking.appointment_date).toLocaleDateString(undefined, {
                      weekday: 'long', day: 'numeric', month: 'short',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
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

      {/* Notifications */}
      <button
        onClick={() => onSectionChange?.('notifications')}
        className="block w-full text-left"
      >
        <Card className="transition-transform active:scale-[0.99]">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 relative">
              <Bell className="h-6 w-6 text-primary" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] leading-[18px] text-center font-bold animate-pop">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Updates
              </p>
              <p className="text-sm font-medium">
                {unread > 0
                  ? `${unread} new update${unread === 1 ? '' : 's'}`
                  : "You're all caught up"}
              </p>
            </div>
            {unread > 0 ? (
              <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </CardContent>
        </Card>
      </button>
    </div>
  );
};
