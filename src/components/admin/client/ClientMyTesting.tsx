import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useRetestInterval, DEFAULT_RETEST_INTERVAL_DAYS } from '@/hooks/useRetestInterval';

export const ClientMyTesting = () => {
  const { user } = useAuth();
  const { data: athlete } = useClientAthlete();
  const { data: retestInterval } = useRetestInterval(athlete?.team_id ?? null);
  const RETEST_INTERVAL_DAYS = retestInterval ?? DEFAULT_RETEST_INTERVAL_DAYS;

  const { data: lastTest, isLoading: lLoading } = useQuery({
    queryKey: ['client-last-test', athlete?.name],
    enabled: !!athlete?.name,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('test_data')
        .select('test_date, test_name, test_location')
        .eq('athlete_name', athlete!.name)
        .order('test_date', { ascending: false })
        .limit(1);
      return (data ?? [])[0] ?? null;
    },
  });

  const { data: nextBooking } = useQuery({
    queryKey: ['client-next-test-booking', athlete?.id, user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('bookings')
        .select('id, appointment_date, notes')
        .or(`client_id.eq.${user!.id}${athlete?.id ? `,client_id.eq.${athlete.id}` : ''}`)
        .gte('appointment_date', nowIso)
        .order('appointment_date', { ascending: true })
        .limit(1);
      return (data ?? [])[0] ?? null;
    },
  });

  const lastDate = lastTest?.test_date ? new Date(lastTest.test_date) : null;
  const suggestedRetest = lastDate
    ? new Date(lastDate.getTime() + RETEST_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const daysUntil = suggestedRetest
    ? Math.ceil((suggestedRetest.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Testing</h2>
        <p className="text-sm text-muted-foreground mt-1">When you last tested and what's next.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Last test
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lLoading ? (
              <Skeleton className="h-16" />
            ) : lastTest ? (
              <>
                <div className="text-2xl font-semibold">
                  {lastDate!.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {lastTest.test_name}
                  {lastTest.test_location ? ` · ${lastTest.test_location}` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No tests on record yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> Next retest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextBooking ? (
              <>
                <div className="text-2xl font-semibold">
                  {new Date(nextBooking.appointment_date).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
                <p className="text-sm text-muted-foreground">Booked with your team.</p>
              </>
            ) : suggestedRetest ? (
              <>
                <div className="text-2xl font-semibold">
                  {suggestedRetest.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
                <Badge variant={daysUntil! <= 0 ? 'default' : 'secondary'}>
                  {daysUntil! <= 0
                    ? 'Due now — book a retest'
                    : `Suggested in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Based on a {RETEST_INTERVAL_DAYS}-day cycle from your last test.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Awaiting your first test.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
