import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';

export const ClientReports = () => {
  const { data: athlete } = useClientAthlete();

  const { data: tests, isLoading } = useQuery({
    queryKey: ['client-reports-tests', athlete?.name],
    enabled: !!athlete?.name,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('test_data')
        .select('test_date, test_name, test_location')
        .eq('athlete_name', athlete!.name)
        .order('test_date', { ascending: false })
        .limit(30);
      // Group by date
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Reports</h2>
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
                <li key={t.date} className="py-3">
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
