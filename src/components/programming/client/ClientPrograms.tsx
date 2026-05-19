import { useMemo, useState } from 'react';
import { format, parseISO, startOfWeek, isAfter, subDays, differenceInCalendarDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, AlertCircle, CheckCircle2, Calendar, Lock, CalendarDays } from 'lucide-react';
import { useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { useClientAthlete } from './useClientAthlete';
import { useClientAssignments, useClientCompletionLogs } from './useClientAssignments';
import { useTemplateStructure } from '../assignments/useAssignments';
import { ClientLogCompletionDialog } from './ClientLogCompletionDialog';
import type { ExerciseOverride } from '../assignments/types';
import { computeAdherence } from '../assignments/adherence';
import { AdherencePanel } from '../assignments/AdherencePanel';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const PrescriptionChips = ({ m }: { m: any }) => {
  const items: Array<{ label: string; value: string }> = [];
  if (m.sets || m.reps) items.push({ label: 'Do', value: `${m.sets ?? '–'} sets × ${m.reps ?? '–'} reps` });
  if (m.load) items.push({ label: 'Load', value: String(m.load) });
  if (m.tempo) items.push({ label: 'Tempo', value: String(m.tempo) });
  if (m.rest_seconds) items.push({ label: 'Rest', value: `${m.rest_seconds}s` });
  if (m.rpe) items.push({ label: 'RPE', value: String(m.rpe) });
  if (items.length === 0) {
    return <p className="mt-1 text-xs italic text-muted-foreground">No prescription set</p>;
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5 text-[11px]">
          <span className="text-muted-foreground">{it.label}:</span>
          <span className="font-medium">{it.value}</span>
        </span>
      ))}
    </div>
  );
};

export const ClientPrograms = () => {
  const isViewAs = useIsViewAsMode();
  const { data: athlete, isLoading: athleteLoading, error: athleteError } = useClientAthlete();
  const { data: assignments = [], isLoading: aLoading, error: aError } =
    useClientAssignments(athlete?.id ?? null);

  const active = assignments.find((a: any) => a.status === 'active') ?? assignments[0] ?? null;
  const history = assignments.filter((a: any) => a.id !== active?.id);

  const { data: structure, isLoading: sLoading } = useTemplateStructure(active?.template_id ?? null);
  const { data: logs = [], isLoading: lLoading } = useClientCompletionLogs(active?.id ?? null);

  const [logOpen, setLogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);

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

  // Build session schedule
  const today = new Date();
  const startDate = active?.start_date ? parseISO(active.start_date) : null;
  const daysSinceStart = startDate ? differenceInCalendarDays(today, startDate) : 0;

  const sessionGroups = useMemo(() => {
    if (!structure) return { today: [], upcoming: [], past: [], unscheduled: [] };
    const blockMap = Object.fromEntries((structure.blocks ?? []).map((b: any) => [b.id, b]));
    const exByBlock: Record<string, any[]> = {};
    const exBySession: Record<string, any[]> = {};
    const unscheduledByBlock: Record<string, any[]> = {};
    (structure.exercises ?? []).forEach((ex: any) => {
      (exByBlock[ex.block_id] = exByBlock[ex.block_id] ?? []).push(ex);
      if (ex.session_id) (exBySession[ex.session_id] = exBySession[ex.session_id] ?? []).push(ex);
      else (unscheduledByBlock[ex.block_id] = unscheduledByBlock[ex.block_id] ?? []).push(ex);
    });

    const completedSessionIds = new Set(
      (logs ?? []).map((l: any) => l.programming_session_id).filter(Boolean)
    );

    const enriched = (structure.sessions ?? []).map((s: any) => ({
      ...s,
      block: blockMap[s.block_id],
      // Session-scoped + block-level (unscheduled) exercises inherited from the parent block
      exercises: [...(exBySession[s.id] ?? []), ...(unscheduledByBlock[s.block_id] ?? [])],
      completed: completedSessionIds.has(s.id),
    }));

    const todayList = enriched.filter((s) => s.day_offset === daysSinceStart);
    const upcoming = enriched
      .filter((s) => s.day_offset > daysSinceStart)
      .sort((a, b) => a.day_offset - b.day_offset)
      .slice(0, 5);
    const past = enriched
      .filter((s) => s.day_offset < daysSinceStart)
      .sort((a, b) => b.day_offset - a.day_offset)
      .slice(0, 5);

    // Unscheduled exercises - shown only if blocks have any
    const unscheduledBlocks = (structure.blocks ?? [])
      .map((b: any) => ({ block: b, exercises: unscheduledByBlock[b.id] ?? [] }))
      .filter((b) => b.exercises.length > 0);

    return { today: todayList, upcoming, past, unscheduled: unscheduledBlocks };
  }, [structure, logs, daysSinceStart]);

  // Adherence (last 7 days)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekLogs = logs.filter((l: any) => isAfter(parseISO(l.performed_on), subDays(weekStart, 1)));
  const distinctDays = new Set(weekLogs.map((l: any) => l.performed_on)).size;
  const lastLogDate = logs[0]?.performed_on ?? null;

  const openExerciseLog = (ex: any) => {
    setSelectedSession(null);
    setSelectedExercise(ex);
    setLogOpen(true);
  };
  const openSessionLog = (s: any) => {
    setSelectedExercise(null);
    setSelectedSession(s ? { id: s.id, name: s.name } : null);
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

  const renderSessionCard = (s: any, variant: 'today' | 'upcoming' | 'past') => (
    <div
      key={s.id}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all animate-fade-in',
        variant === 'today' && 'border-primary/40 shadow-md shadow-primary/5 bg-gradient-to-br from-primary/5 to-transparent',
        variant === 'past' && s.completed && 'opacity-80',
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold truncate">{s.name}</p>
            {s.completed && (
              <Badge variant="outline" className="h-5 text-[10px] gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Done
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {s.block?.name ?? 'Block'} · D+{s.day_offset}
            {startDate ? ` · ${format(new Date(startDate.getTime() + s.day_offset * 86400000), 'EEE d MMM')}` : ''}
          </p>
        </div>
        {variant === 'today' && (
          <Button size="sm" disabled={isViewAs} onClick={() => openSessionLog(s)} className="shrink-0 rounded-full gap-1">
            <ClipboardCheck className="h-4 w-4" /> Start
          </Button>
        )}
      </div>
      <div className="divide-y border-t bg-card/40">
        {s.exercises.length === 0 ? (
          <p className="px-4 py-3 text-xs italic text-muted-foreground">No exercises in this session.</p>
        ) : (
          s.exercises.map((ex: any) => {
            const m = merge(ex);
            const lib = structure?.library?.[ex.exercise_id] ?? {};
            return (
              <div key={ex.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{lib.name ?? 'Exercise'}</p>
                    {m.hasOverride && <Badge variant="outline" className="text-xs">Adjusted</Badge>}
                  </div>
                  <PrescriptionChips m={m} />
                  {m.notes && <p className="mt-1 text-xs italic text-muted-foreground">{m.notes}</p>}
                </div>
                {variant === 'today' && (
                  <Button size="sm" variant="ghost" disabled={isViewAs}
                    onClick={() => openExerciseLog({ id: ex.id, name: lib.name ?? 'Exercise', sets: m.sets, reps: m.reps, load: m.load })}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Log
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

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
                  {startDate ? ` · Day ${daysSinceStart + 1}` : ''}
                </p>
              </div>
              <Badge className="capitalize">{active.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(() => {
              const adherence = computeAdherence({
                startDate: active.start_date,
                sessions: structure?.sessions ?? [],
                blocks: structure?.blocks ?? [],
                completionLogs: logs as any,
              });
              const next = adherence.nextSession;
              return (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">This week</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className="text-2xl font-semibold">{adherence.weekAdherence}%</p>
                        <p className="text-xs text-muted-foreground">
                          {adherence.weekCompleted} done · {adherence.weekMissed} missed
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3" /> Streak: {adherence.currentStreak}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">
                        {next?.status === 'today' ? 'Today' : 'Next session'}
                      </p>
                      {next ? (
                        <>
                          <p className="mt-1 text-base font-semibold truncate">{next.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(next.date), 'EEE d MMM')}
                            {next.block_name ? ` · ${next.block_name}` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">No upcoming sessions</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            <Separator />

            {sLoading && <Skeleton className="h-40 w-full" />}

            {!sLoading && (
              <>
                {/* Today */}
                <div className="space-y-3">
                  <SectionTitle>Today's session</SectionTitle>
                  {sessionGroups.today.length === 0 ? (
                    <EmptyState
                      title="No session scheduled for today"
                      description="Check upcoming sessions below or any unscheduled exercises."
                    />
                  ) : (
                    sessionGroups.today.map((s) => renderSessionCard(s, 'today'))
                  )}
                </div>

                {/* Upcoming */}
                {sessionGroups.upcoming.length > 0 && (
                  <div className="space-y-3">
                    <SectionTitle>Upcoming sessions</SectionTitle>
                    {sessionGroups.upcoming.map((s) => renderSessionCard(s, 'upcoming'))}
                  </div>
                )}

                {/* Completed/past */}
                {sessionGroups.past.length > 0 && (
                  <div className="space-y-3">
                    <SectionTitle>Recent sessions</SectionTitle>
                    {sessionGroups.past.map((s) => renderSessionCard(s, 'past'))}
                  </div>
                )}

                {/* Unscheduled fallback */}
                {sessionGroups.unscheduled.length > 0 && (
                  <div className="space-y-3">
                    <SectionTitle>Unscheduled exercises</SectionTitle>
                    {sessionGroups.unscheduled.map(({ block, exercises }) => (
                      <div key={block.id} className="rounded-md border">
                        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                          <p className="text-sm font-semibold">
                            {block.name}
                            {block.week_number ? (
                              <span className="ml-2 text-xs text-muted-foreground">Week {block.week_number}</span>
                            ) : null}
                          </p>
                          <Button size="sm" variant="ghost" disabled={isViewAs} onClick={() => openSessionLog(null)}>
                            <ClipboardCheck className="mr-1 h-4 w-4" /> Log
                          </Button>
                        </div>
                        <div className="divide-y">
                          {exercises.map((ex: any) => {
                            const m = merge(ex);
                            const lib = structure?.library?.[ex.exercise_id] ?? {};
                            return (
                              <div key={ex.id} className="flex items-start justify-between gap-3 p-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{lib.name ?? 'Exercise'}</p>
                                    {m.hasOverride && <Badge variant="outline" className="text-xs">Adjusted</Badge>}
                                  </div>
                                  <PrescriptionChips m={m} />
                                </div>
                                <Button size="sm" variant="ghost" disabled={isViewAs}
                                  onClick={() => openExerciseLog({ id: ex.id, name: lib.name ?? 'Exercise', sets: m.sets, reps: m.reps, load: m.load })}>
                                  <CheckCircle2 className="mr-1 h-4 w-4" /> Log
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty programme */}
                {(structure?.blocks?.length ?? 0) === 0 && (
                  <EmptyState
                    title="No exercises in this programme yet"
                    description="Your practitioner hasn't added exercises to this programme."
                  />
                )}
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <SectionTitle>Recent logs</SectionTitle>
              {lLoading && <Skeleton className="h-24 w-full" />}
              {!lLoading && !logs.length && (
                <EmptyState title="No sessions logged yet" description="Logged sessions will appear here." />
              )}
              {!lLoading && logs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-start justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {format(parseISO(log.performed_on), 'EEE d MMM yyyy')}
                      {log.programming_session_id && !log.programming_exercise_id && (
                        <Badge variant="outline" className="ml-2 text-[10px] gap-1">
                          <CalendarDays className="h-3 w-3" /> Session
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        log.sets_completed ? `${log.sets_completed} sets` : null,
                        log.reps_completed ? `${log.reps_completed} reps` : null,
                        log.load_used ? `@ ${log.load_used}` : null,
                        log.rpe ? `RPE ${log.rpe}` : null,
                      ].filter(Boolean).join(' · ') || 'Session logged'}
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
          session={selectedSession}
        />
      )}
    </div>
  );
};
