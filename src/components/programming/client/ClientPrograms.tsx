import { useMemo, useState } from 'react';
import { format, parseISO, startOfWeek, isAfter, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, AlertCircle, CheckCircle2, Calendar, Lock } from 'lucide-react';
import { useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { useClientAthlete } from './useClientAthlete';
import {
  useClientAssignments,
  useClientCompletionLogs,
} from './useClientAssignments';
import { useTemplateStructure } from '../assignments/useAssignments';
import { ClientLogCompletionDialog } from './ClientLogCompletionDialog';
import type { ExerciseOverride } from '../assignments/types';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{children}</h3>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
    <AlertCircle className="h-4 w-4" /> {message}
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-md border border-dashed p-6 text-center">
    <p className="text-sm font-medium">{title}</p>
    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
  </div>
);

export const ClientPrograms = () => {
  const isViewAs = useIsViewAsMode();
  const { data: athlete, isLoading: athleteLoading, error: athleteError } = useClientAthlete();
  const {
    data: assignments = [],
    isLoading: aLoading,
    error: aError,
  } = useClientAssignments(athlete?.id ?? null);

  const active = assignments.find((a: any) => a.status === 'active') ?? assignments[0] ?? null;
  const history = assignments.filter((a: any) => a.id !== active?.id);

  const { data: structure, isLoading: sLoading } = useTemplateStructure(active?.template_id ?? null);
  const { data: logs = [], isLoading: lLoading } = useClientCompletionLogs(active?.id ?? null);

  const [logOpen, setLogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  const exercisesByBlock = useMemo(() => {
    const map: Record<string, any[]> = {};
    (structure?.exercises ?? []).forEach((ex: any) => {
      (map[ex.block_id] = map[ex.block_id] ?? []).push(ex);
    });
    return map;
  }, [structure]);

  const overrides: Record<string, ExerciseOverride> =
    (active?.override_payload as Record<string, ExerciseOverride>) ?? {};

  const merge = (ex: any) => {
    const ov = overrides[ex.id] ?? {};
    return {
      sets: ov.sets ?? ex.sets,
      reps: ov.reps ?? ex.reps,
      load: ov.load ?? ex.load,
      tempo: ov.tempo ?? ex.tempo,
      rest_seconds: ov.rest_seconds ?? ex.rest_seconds,
      rpe: ov.rpe ?? ex.rpe,
      notes: ov.notes ?? ex.notes,
      hasOverride: !!overrides[ex.id],
    };
  };

  // Adherence (last 7 days)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekLogs = logs.filter((l: any) => isAfter(parseISO(l.performed_on), subDays(weekStart, 1)));
  const distinctDays = new Set(weekLogs.map((l: any) => l.performed_on)).size;

  const lastLogDate = logs[0]?.performed_on ?? null;

  const openLogDialog = (ex: any | null) => {
    setSelectedExercise(ex);
    setLogOpen(true);
  };

  if (athleteLoading || aLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (athleteError) return <ErrorState message="Could not load your athlete profile." />;
  if (!athlete)
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">My Programmes</h2>
        <EmptyState
          title="No athlete record linked"
          description="Your account is not yet linked to an athlete profile. Please contact your practitioner."
        />
      </div>
    );

  if (aError) return <ErrorState message="Could not load your assignments." />;

  if (!assignments.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">My Programmes</h2>
        <EmptyState
          title="No programmes assigned yet"
          description="Once your practitioner assigns a programme, it will appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">My Programmes</h2>
        {isViewAs && (
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" /> View-As (read-only)
          </Badge>
        )}
      </div>

      {active && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{active.template_name ?? 'Programme'}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {active.programming_templates?.goal ?? 'Active programme'} ·{' '}
                  {active.programming_templates?.duration_weeks
                    ? `${active.programming_templates.duration_weeks} weeks`
                    : 'No duration set'}
                </p>
              </div>
              <Badge className="capitalize">{active.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Adherence */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">This week</p>
                <p className="text-2xl font-semibold">{distinctDays}</p>
                <p className="text-xs text-muted-foreground">training days</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total sessions</p>
                <p className="text-2xl font-semibold">{logs.length}</p>
                <p className="text-xs text-muted-foreground">logged</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Last session</p>
                <p className="text-lg font-semibold">
                  {lastLogDate ? format(parseISO(lastLogDate), 'd MMM') : '—'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Programme structure */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SectionTitle>Today's exercises</SectionTitle>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isViewAs}
                  onClick={() => openLogDialog(null)}
                >
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Log whole session
                </Button>
              </div>

              {sLoading && <Skeleton className="h-40 w-full" />}
              {!sLoading && (!structure?.blocks?.length) && (
                <EmptyState
                  title="No exercises in this programme yet"
                  description="Your practitioner hasn't added exercises to this programme."
                />
              )}
              {!sLoading &&
                structure?.blocks?.map((block: any) => (
                  <div key={block.id} className="rounded-md border">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                      <p className="text-sm font-semibold">
                        {block.name}
                        {block.week_number ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Week {block.week_number}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="divide-y">
                      {(exercisesByBlock[block.id] ?? []).map((ex: any) => {
                        const m = merge(ex);
                        const lib = structure.library[ex.exercise_id] ?? {};
                        return (
                          <div key={ex.id} className="flex items-start justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{lib.name ?? 'Exercise'}</p>
                                {m.hasOverride && (
                                  <Badge variant="outline" className="text-xs">Adjusted</Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[
                                  m.sets ? `${m.sets} sets` : null,
                                  m.reps ? `${m.reps} reps` : null,
                                  m.load ? `@ ${m.load}` : null,
                                  m.rpe ? `RPE ${m.rpe}` : null,
                                  m.tempo ? `Tempo ${m.tempo}` : null,
                                  m.rest_seconds ? `${m.rest_seconds}s rest` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || 'No prescription set'}
                              </p>
                              {m.notes && (
                                <p className="mt-1 text-xs italic text-muted-foreground">{m.notes}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isViewAs}
                              onClick={() =>
                                openLogDialog({
                                  id: ex.id,
                                  name: lib.name ?? 'Exercise',
                                  sets: m.sets,
                                  reps: m.reps,
                                  load: m.load,
                                })
                              }
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" /> Log
                            </Button>
                          </div>
                        );
                      })}
                      {!(exercisesByBlock[block.id] ?? []).length && (
                        <p className="px-3 py-3 text-xs text-muted-foreground">No exercises in this block.</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <Separator />

            {/* Recent logs */}
            <div className="space-y-2">
              <SectionTitle>Recent sessions</SectionTitle>
              {lLoading && <Skeleton className="h-24 w-full" />}
              {!lLoading && !logs.length && (
                <EmptyState title="No sessions logged yet" description="Logged sessions will appear here." />
              )}
              {!lLoading && logs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-start justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {format(parseISO(log.performed_on), 'EEE d MMM yyyy')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        log.sets_completed ? `${log.sets_completed} sets` : null,
                        log.reps_completed ? `${log.reps_completed} reps` : null,
                        log.load_used ? `@ ${log.load_used}` : null,
                        log.rpe ? `RPE ${log.rpe}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Session logged'}
                    </p>
                    {log.notes && <p className="mt-1 text-xs italic text-muted-foreground">{log.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programme history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{a.template_name ?? 'Programme'}</p>
                  <p className="text-xs text-muted-foreground">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {format(parseISO(a.start_date), 'd MMM yyyy')}
                    {a.end_date ? ` — ${format(parseISO(a.end_date), 'd MMM yyyy')}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {active && athlete && (
        <ClientLogCompletionDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          assignment={{ id: active.id, team_id: active.team_id, athlete_id: active.athlete_id }}
          athleteId={athlete.id}
          exercise={selectedExercise}
        />
      )}
    </div>
  );
};
