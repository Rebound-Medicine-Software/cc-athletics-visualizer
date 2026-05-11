import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import type { AdherenceMetrics } from './adherence';

interface Props {
  metrics: AdherenceMetrics;
  showTimeline?: boolean;
  compact?: boolean;
}

const statusBadge = {
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  missed: { label: 'Missed', icon: XCircle, cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' },
  today: { label: 'Today', icon: Clock, cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  upcoming: { label: 'Upcoming', icon: Calendar, cls: 'bg-muted text-muted-foreground border-border' },
} as const;

export const AdherencePanel = ({ metrics, showTimeline = false, compact = false }: Props) => {
  const m = metrics;

  if (m.totalSessionsAll === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No scheduled sessions yet.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Adherence</span>
          <Badge variant="outline" className="font-mono">
            {m.adherencePercentage}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={m.adherencePercentage} className="h-2" />
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Completed</div>
            <div className="font-semibold">
              {m.completedSessions}/{m.totalSessionsToDate}
            </div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Missed</div>
            <div className="font-semibold">{m.missedSessions}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
              <Flame className="h-3 w-3" /> Streak
            </div>
            <div className="font-semibold">{m.currentStreak}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Last session</div>
            <div className="font-semibold text-xs">
              {m.lastCompletedDate ? format(parseISO(m.lastCompletedDate), 'd MMM') : '—'}
            </div>
          </div>
        </div>

        {showTimeline && m.sessions.length > 0 && (
          <div className="space-y-1 pt-2">
            <div className="text-xs font-medium text-muted-foreground">Session timeline</div>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {m.sessions.map((s) => {
                const sb = statusBadge[s.status];
                const Icon = sb.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(parseISO(s.date), 'EEE d MMM')}
                        {s.block_name ? ` · ${s.block_name}` : ''}
                      </div>
                    </div>
                    <Badge variant="outline" className={`gap-1 ${sb.cls}`}>
                      <Icon className="h-3 w-3" />
                      {sb.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
