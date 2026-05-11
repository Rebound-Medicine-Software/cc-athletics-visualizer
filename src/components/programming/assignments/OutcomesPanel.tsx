import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, TrendingUp } from 'lucide-react';
import { useAssignmentOutcomes, type OutcomeRow } from './useOutcomes';

interface Props {
  athleteId: string | null | undefined;
  startDate: string | null | undefined;
  adherencePercentage: number;
  compact?: boolean;
}

const fmt = (n: number, unit: string) => {
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${n.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
};

const ChangeBadge = ({ row }: { row: OutcomeRow }) => {
  if (row.changePct == null) return null;
  const Icon = row.direction === 'up' ? ArrowUpRight : row.direction === 'down' ? ArrowDownRight : Minus;
  const positive = row.metric.higherIsBetter ? row.direction === 'up' : row.direction === 'down';
  const cls = positive
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
    : row.direction === 'flat'
    ? 'bg-muted text-muted-foreground'
    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
  const sign = row.changePct > 0 ? '+' : '';
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <Icon className="h-3 w-3" />
      {sign}
      {row.changePct.toFixed(1)}%
    </Badge>
  );
};

export const OutcomesPanel = ({ athleteId, startDate, adherencePercentage, compact }: Props) => {
  const { data: rows, isLoading, error } = useAssignmentOutcomes({ athleteId, startDate });

  const withData = (rows ?? []).filter((r) => r.before && r.after);
  const partial = (rows ?? []).filter((r) => !r.before || !r.after);

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Programming Outcome Snapshot
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Observed change during programme — not a causal claim.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Could not load test data.
          </div>
        )}
        {!isLoading && !error && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Adherence: {adherencePercentage}%</Badge>
              <Badge variant="outline">
                Tests compared: {withData.length}/{rows?.length ?? 0}
              </Badge>
              {startDate && (
                <Badge variant="outline">
                  Programme start: {format(parseISO(startDate), 'd MMM yyyy')}
                </Badge>
              )}
            </div>

            {withData.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Not enough test data to compare. Need at least one test before and one on/after the programme start.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {withData.map((r) => (
                  <div key={r.metric.key} className="rounded-md border p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{r.metric.label}</div>
                      <ChangeBadge row={r} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Before</div>
                        <div className="font-mono font-semibold">
                          {fmt(r.before!.value, r.metric.unit)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(parseISO(r.before!.date), 'd MMM yyyy')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">After</div>
                        <div className="font-mono font-semibold">
                          {fmt(r.after!.value, r.metric.unit)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(parseISO(r.after!.date), 'd MMM yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {partial.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">
                  {partial.length} metric{partial.length === 1 ? '' : 's'} skipped (insufficient data)
                </summary>
                <ul className="mt-1 list-disc pl-4">
                  {partial.map((r) => (
                    <li key={r.metric.key}>
                      {r.metric.label}: {!r.before && !r.after ? 'no test data' : !r.before ? 'no baseline before start' : 'no follow-up since start'}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
