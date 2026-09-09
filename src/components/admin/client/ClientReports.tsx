import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { AthleteReportView } from './AthleteReportView';

type View = 'history' | 'report';

export const ClientReports = () => {
  const { data: athlete } = useClientAthlete();
  const [view, setView] = useState<View>('report');

    const { data: tests, isLoading } = useQuery({
            queryKey: ['client-reports-tests', athlete?.name, athlete?.team_id],
            enabled: !!athlete?.name,
            staleTime: 60_000,
            queryFn: async () => {
                      // Resolve the athlete's team name so this lookup can be scoped by team —
                      // without this, a same-named athlete on a different team could have
                      // their test sessions silently mixed into this athlete's own "Test
                      // history" log. Same team_id -> teams.name pattern as
                      // ClientMyTesting.tsx's resolveTeamName()-style fix (PR #39).
                      let teamName: string | null = null;
                      if (athlete!.team_id) {
                                  const { data: teamRow } = await supabase
                                    .from('teams')
                                    .select('name')
                                    .eq('id', athlete!.team_id)
                                    .maybeSingle();
                                  teamName = teamRow?.name ?? null;
                      }

                      const baseQuery = supabase
                        .from('test_data')
                        .select('test_date, test_name, test_location')
                        .eq('athlete_name', athlete!.name)
                        .order('test_date', { ascending: false })
                        .limit(30);

                      // Falls back to the unscoped query only if the team lookup itself
                      // came back empty — never after a scoped query returns zero rows,
                      // which would just re-introduce the cross-team collision.
                      const { data } = teamName
                        ? await baseQuery.eq('team_name', teamName)
                                  : await baseQuery;

                      const byDate = new Map<string, { date: string; tests: string[]; location: string | null }>();
                      (data ?? []).forEach((t: any) => {
                                  const e = byDate.get(t.test_date);
                                  if (e) {
                                                if (!e.tests.includes(t.test_name)) e.tests.push(t.test_name);
                                  } else {
                                                byDate.set(t.test_date, { date: t.test_date, tests: [t.test_name], location: t.test_location });
                                  }
                      });
                      return Array.from(byDate.values());
            },
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant={view === 'report' ? 'default' : 'outline'} size="sm" onClick={() => setView('report')}>
          My report
        </Button>
        <Button variant={view === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setView('history')}>
          Test history
        </Button>
      </div>

      {view === 'report' ? (
        <AthleteReportView />
      ) : (
        <>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Test history</h2>
            <p className="text-sm text-muted-foreground mt-1">
              A simple log of every testing session linked to your account.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Test history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32" />
              ) : !tests || tests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No test reports yet.</p>
              ) : (
                <ul className="divide-y">
                  {tests.map((t) => (
                    <li key={t.date} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm">
                          {new Date(t.date).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t.tests.join(' · ')}
                          {t.location ? ` · ${t.location}` : ''}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setView('report')}>
                        <Eye className="h-3.5 w-3.5" /> Open
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
