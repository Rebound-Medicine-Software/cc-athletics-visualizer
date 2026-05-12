import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useClientMetrics, useClientRankings } from './useClientMetrics';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';
import { cn } from '@/lib/utils';

const formatVal = (v: number | null, unit: string) => {
  if (v == null) return '—';
  const rounded = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);
  return unit ? `${rounded} ${unit}` : rounded;
};

const motivationalCopy = (
  metricLabel: string,
  changePct: number | null,
  isImprovement: boolean | null,
): string => {
  if (changePct == null) return 'Need a follow-up test to see your trend.';
  const abs = Math.abs(changePct);
  if (isImprovement === null) return 'Steady — consistency wins.';
  if (isImprovement) {
    if (abs >= 10) return `🔥 Big gains — your ${metricLabel.toLowerCase()} is up ${abs.toFixed(1)}%.`;
    if (abs >= 3) return `Strong progress — up ${abs.toFixed(1)}% from baseline.`;
    return `Moving in the right direction (+${abs.toFixed(1)}%).`;
  }
  if (abs >= 10) return `Down ${abs.toFixed(1)}% — chat to your coach about adjustments.`;
  return `Slightly down (${abs.toFixed(1)}%) — could be normal variation.`;
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

  if (aLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight">Your progress</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How your key numbers are trending.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sportComparisonLabel((athlete as any)?.sports)}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {mLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))
          : (metrics ?? []).map((m, idx) => {
              const Icon =
                m.direction === 'up' ? TrendingUp : m.direction === 'down' ? TrendingDown : Minus;
              const positive = m.isImprovement === true;
              const negative = m.isImprovement === false;
              return (
                <Card
                  key={m.spec.short}
                  className={cn(
                    'overflow-hidden transition-shadow hover:shadow-md animate-scale-in',
                    positive && 'border-emerald-500/30',
                    negative && 'border-rose-500/30',
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {m.spec.label}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                          positive
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : negative
                            ? 'bg-rose-500/15 text-rose-600'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    {m.latest ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <div className="text-3xl font-bold tabular-nums leading-none">
                            {formatVal(m.latest.value, m.spec.unit)}
                          </div>
                          {m.changePct != null && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                'h-5 text-[10px] font-semibold',
                                positive
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : negative
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                                  : '',
                              )}
                            >
                              {m.changePct > 0 ? '+' : ''}
                              {m.changePct.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm leading-snug">
                          {motivationalCopy(m.spec.label, m.changePct, m.isImprovement)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Latest {new Date(m.latest.date).toLocaleDateString()}
                          {m.baseline && m.baseline.date !== m.latest.date && (
                            <>
                              {' · '}from {formatVal(m.baseline.value, m.spec.unit)}
                            </>
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No test results yet for this metric.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">How you compare</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Anonymised — we never show others' names.
              </p>
            </div>
          </div>

          {rLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : !rankings?.length ? (
            <p className="text-sm text-muted-foreground">No comparison data yet.</p>
          ) : (
            <div className="space-y-2">
              {rankings.map((r) => {
                const pct =
                  r.rank && r.totalAthletes >= 5
                    ? Math.max(1, Math.round((r.rank / r.totalAthletes) * 100))
                    : null;
                const top = pct != null && pct <= 25;
                const percentileCopy =
                  pct != null
                    ? pct <= 50
                      ? `Top ${pct}% in ${r.scopeLabel}`
                      : `Above ${100 - pct}% in ${r.scopeLabel}`
                    : r.totalAthletes < 5
                    ? 'Need more athletes for a reliable comparison'
                    : null;
                return (
                  <div
                    key={`${r.spec.short}-${r.scope}`}
                    className="flex items-center justify-between rounded-xl border bg-card/50 p-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{r.spec.label}</span>
                        {top && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      {percentileCopy && (
                        <p className={cn(
                          'text-xs mt-0.5 font-medium',
                          top ? 'text-amber-600' : 'text-primary',
                        )}>
                          {percentileCopy}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">{r.beatenByLabel}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold tabular-nums text-lg leading-none">
                        {r.rank ? `#${r.rank}` : '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        of {r.totalAthletes}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
