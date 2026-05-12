import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useClientMetrics, useClientRankings } from './useClientMetrics';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';

const formatVal = (v: number | null, unit: string) => {
  if (v == null) return '—';
  const rounded = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
  return unit ? `${rounded} ${unit}` : rounded;
};

const plainEnglish = (changePct: number | null, isImprovement: boolean | null): string => {
  if (changePct == null) return 'Need a follow-up test to compare progress.';
  const abs = Math.abs(changePct);
  if (isImprovement === null) return 'Holding steady since baseline.';
  if (isImprovement) return `Up ${abs.toFixed(1)}% since your baseline — nice work.`;
  return `Down ${abs.toFixed(1)}% vs baseline — worth chatting to your coach.`;
};

export const ClientMyProgress = () => {
  const { data: athlete, isLoading: aLoading } = useClientAthlete();
  const args = {
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  };
  const { data: metrics, isLoading: mLoading } = useClientMetrics(args);
  const { data: rankings, isLoading: rLoading } = useClientRankings({
    ...args,
    teamName: null,
  });

  if (aLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Progress</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A simple view of your key performance numbers and how they're trending.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {sportComparisonLabel((athlete as any)?.sports)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          : (metrics ?? []).map((m) => {
              const Icon = m.direction === 'up' ? TrendingUp : m.direction === 'down' ? TrendingDown : Minus;
              const tone =
                m.isImprovement === true
                  ? 'text-emerald-600'
                  : m.isImprovement === false
                  ? 'text-rose-600'
                  : 'text-muted-foreground';
              return (
                <Card key={m.spec.short}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{m.spec.label}</span>
                      <Icon className={`h-4 w-4 ${tone}`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {m.latest ? (
                      <>
                        <div className="flex items-baseline gap-3">
                          <div className="text-3xl font-bold tabular-nums">
                            {formatVal(m.latest.value, m.spec.unit)}
                          </div>
                          {m.changePct != null && (
                            <Badge variant={m.isImprovement ? 'default' : 'secondary'} className={tone}>
                              {m.changePct > 0 ? '+' : ''}
                              {m.changePct.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Latest test {new Date(m.latest.date).toLocaleDateString()}
                          {m.baseline && m.baseline.date !== m.latest.date && (
                            <> · baseline {formatVal(m.baseline.value, m.spec.unit)} on {new Date(m.baseline.date).toLocaleDateString()}</>
                          )}
                        </div>
                        <p className="text-sm">{plainEnglish(m.changePct, m.isImprovement)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No test results yet for this metric.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How you compare</CardTitle>
          <p className="text-xs text-muted-foreground">Anonymised — we never show other athletes' names or details.</p>
        </CardHeader>
        <CardContent>
          {rLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !rankings?.length ? (
            <p className="text-sm text-muted-foreground">No comparison data yet.</p>
          ) : (
            <div className="space-y-3">
              {rankings.map((r) => (
                <div key={`${r.spec.short}-${r.scope}`} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{r.spec.label}</div>
                    <div className="text-xs text-muted-foreground">{r.beatenByLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">
                      {r.rank ? `#${r.rank}` : '—'}
                      <span className="text-xs text-muted-foreground"> / {r.totalAthletes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
