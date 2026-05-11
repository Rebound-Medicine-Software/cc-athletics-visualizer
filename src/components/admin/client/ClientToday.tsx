import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, Bell, Activity, ArrowRight, Dumbbell, Trophy, Hourglass } from 'lucide-react';
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

interface Props {
  onSectionChange?: (section: string) => void;
}

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

  const { data: unread } = useQuery({
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

  // Retest: pull team's interval (fallback 42d) and last test date
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
      // 1) Confirmation in athlete's own feed
      await supabase.from('platform_in_app_notifications').insert({
        recipient_user_id: user.id,
        team_id: athlete.team_id,
        title: '⏳ Retest requested',
        message: `${athlete.name} requested a retest. Your coach has been notified.`,
        severity: 'info',
        metadata: { notification_type: 'retest_due', source: 'client_request', athlete_id: athlete.id },
      });
      // 2) Broadcast to all practitioners on the team (engagement loop)
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

  const todaySession = useMemo(() => {
    if (!active || !structure) return null;
    const adherence = computeAdherence({
      startDate: active.start_date,
      sessions: structure.sessions ?? [],
      blocks: structure.blocks ?? [],
      completionLogs: [],
      today: new Date(),
    });
    return adherence.todaySession ?? adherence.nextSession ?? null;
  }, [active, structure]);

  const heroMetric = useMemo(() => {
    if (!metrics) return null;
    return metrics.find((m) => m.latest) ?? null;
  }, [metrics]);

  const greetingName =
    athlete?.name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'there';

  if (aLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hi {greetingName} 👋</h2>
        <p className="text-sm text-muted-foreground mt-1">Here's what's on for you today.</p>
      </div>

      {retestStatus?.due && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <Hourglass className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">⏳ Time to re-test</div>
                <p className="text-xs text-muted-foreground">
                  It's been {retestStatus.days} days since your last test.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => onSectionChange?.('bookings')}>
              Book testing
            </Button>
            <Button size="sm" variant="outline" onClick={requestRetest}>
              Request retest
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's plan */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Today's plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaySession ? (
              <>
                <div className="text-2xl font-semibold">{todaySession.name}</div>
                <p className="text-sm text-muted-foreground">
                  Part of <span className="font-medium">{active?.template_name}</span>
                </p>
              </>
            ) : active ? (
              <p className="text-sm text-muted-foreground">
                No session scheduled for today — enjoy a recovery day.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You don't have an active programme yet. Your coach will assign one soon.
              </p>
            )}
            <Button onClick={() => onSectionChange?.('programming')} className="gap-1">
              View today's plan <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Next booking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Next session / retest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextBooking ? (
              <>
                <div className="text-xl font-semibold">
                  {new Date(nextBooking.appointment_date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(nextBooking.appointment_date).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {nextBooking.notes && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{nextBooking.notes}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming bookings yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Latest progress metric */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Latest result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {heroMetric?.latest ? (
              <>
                <div className="text-xs text-muted-foreground">{heroMetric.spec.label}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-2xl font-bold tabular-nums">
                    {heroMetric.latest.value.toFixed(2)} {heroMetric.spec.unit}
                  </div>
                  {heroMetric.changePct != null && (
                    <Badge variant={heroMetric.isImprovement ? 'default' : 'secondary'}>
                      {heroMetric.changePct > 0 ? '+' : ''}
                      {heroMetric.changePct.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => onSectionChange?.('progress')}
                  className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  See full progress <ArrowRight className="h-3 w-3" />
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No test results yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
              {unread ? <Badge variant="default">{unread} new</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {unread
                ? `You have ${unread} unread update${unread === 1 ? '' : 's'}.`
                : "You're all caught up."}
            </p>
            <Button variant="outline" onClick={() => onSectionChange?.('notifications')} className="gap-1">
              <Trophy className="h-4 w-4" /> View all
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
