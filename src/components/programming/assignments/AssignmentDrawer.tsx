import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  Lock,
  Sliders,
  ClipboardCheck,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  useAssignment,
  useTemplateStructure,
  useCompletionSummary,
  useUpdateAssignmentStatus,
  useDeleteCompletionLog,
} from './useAssignments';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { OverrideEditorDialog } from './OverrideEditorDialog';
import { LogCompletionDialog } from './LogCompletionDialog';
import type { AssignmentStatus, ExerciseOverride } from './types';
import { computeAdherence } from './adherence';
import { AdherencePanel } from './AdherencePanel';
import { OutcomesPanel } from './OutcomesPanel';
import { ProgrammingAiSummaryPanel } from './ProgrammingAiSummaryPanel';

interface Props {
  assignmentId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const statusVariant: Record<AssignmentStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  paused: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  completed: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  cancelled: 'bg-muted text-muted-foreground',
};

export const AssignmentDrawer = ({ assignmentId, open, onOpenChange }: Props) => {
  const {
    data: assignment,
    isLoading,
    error: assignmentError,
  } = useAssignment(assignmentId);
  const templateId = assignment?.template_id ?? null;
  const {
    data: structure,
    isLoading: sLoading,
    error: structureError,
  } = useTemplateStructure(templateId);
  const {
    data: logs = [],
    isLoading: logsLoading,
    error: logsError,
  } = useCompletionSummary(assignmentId);
  const statusMut = useUpdateAssignmentStatus();
  const deleteLogMut = useDeleteCompletionLog();

  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const canOverride = hasPermission('can_adjust_sets_reps') || canEdit;
  const guardWrite = useViewAsWriteGuard();

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const exercisesByBlock = useMemo(() => {
    const map: Record<string, any[]> = {};
    (structure?.exercises ?? []).forEach((e) => {
      (map[e.block_id] = map[e.block_id] ?? []).push(e);
    });
    return map;
  }, [structure]);

  const overrides: Record<string, ExerciseOverride> =
    (assignment?.override_payload as any) ?? {};
  const overrideCount = Object.keys(overrides).length;

  const sessionsCount = logs.length;
  const lastSession = logs[0]?.performed_on as string | undefined;
  const uniqueDays = useMemo(
    () => new Set(logs.map((l: any) => l.performed_on)).size,
    [logs]
  );

  const adherenceMetrics = useMemo(
    () =>
      computeAdherence({
        startDate: assignment?.start_date,
        sessions: structure?.sessions ?? [],
        blocks: structure?.blocks ?? [],
        completionLogs: logs as any,
      }),
    [assignment?.start_date, structure?.sessions, structure?.blocks, logs]
  );

  const setStatus = (next: AssignmentStatus) => {
    if (!assignment) return;
    if (guardWrite('Updating assignment')) return;
    statusMut.mutate({ id: assignment.id, status: next, athleteId: assignment.athlete_id });
  };

  const removeLog = (logId: string) => {
    if (!assignment) return;
    if (guardWrite('Removing log')) return;
    deleteLogMut.mutate({ id: logId, assignmentId: assignment.id });
  };

  const exerciseLabel = (programmingExerciseId: string | null | undefined) => {
    if (!programmingExerciseId) return 'Whole session';
    const ex = (structure?.exercises ?? []).find((e: any) => e.id === programmingExerciseId);
    if (!ex) return 'Exercise';
    const lib = ex.exercise_id ? structure?.library[ex.exercise_id] : null;
    return lib?.name ?? 'Custom exercise';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assignment details</SheetTitle>
          <SheetDescription>
            Manage overrides, log completion, and review programme structure.
          </SheetDescription>
        </SheetHeader>

        {assignmentError ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <div className="font-medium">Could not load assignment</div>
              <div className="text-muted-foreground">{(assignmentError as any).message}</div>
            </div>
          </div>
        ) : isLoading || !assignment ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-5 mt-4">
            {/* Athlete + status */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm text-muted-foreground">Athlete</div>
                  <div className="font-medium">{assignment.athletes?.name ?? '—'}</div>
                  {assignment.athletes?.email && (
                    <div className="text-xs text-muted-foreground">
                      {assignment.athletes.email}
                    </div>
                  )}
                </div>
                <Badge className={statusVariant[assignment.status as AssignmentStatus]}>
                  {assignment.status}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Start</div>
                  <div>{format(parseISO(assignment.start_date), 'PP')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">End</div>
                  <div>
                    {assignment.end_date ? format(parseISO(assignment.end_date), 'PP') : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap gap-2">
              {!canEdit && !canOverride && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Read-only (tier)
                </div>
              )}
              {canOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (guardWrite('Editing overrides')) return;
                    setOverrideOpen(true);
                  }}
                >
                  <Sliders className="h-4 w-4 mr-1" /> Overrides
                  {overrideCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                      {overrideCount}
                    </Badge>
                  )}
                </Button>
              )}
              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (guardWrite('Logging completion')) return;
                    setLogOpen(true);
                  }}
                >
                  <ClipboardCheck className="h-4 w-4 mr-1" /> Log session
                </Button>
              )}
              {canEdit && assignment.status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => setStatus('paused')}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              {canEdit && assignment.status === 'paused' && (
                <Button size="sm" variant="outline" onClick={() => setStatus('active')}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              )}
              {canEdit && (assignment.status === 'active' || assignment.status === 'paused') && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setStatus('completed')}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Mark complete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus('cancelled')}>
                    <XCircle className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </>
              )}
            </div>

            {/* Template summary */}
            <div className="rounded-lg border p-4 space-y-1">
              <div className="text-sm text-muted-foreground">Template</div>
              <div className="font-medium">
                {assignment.programming_templates?.name ?? '—'}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {assignment.programming_templates?.goal && (
                  <Badge variant="outline">{assignment.programming_templates.goal}</Badge>
                )}
                {assignment.programming_templates?.duration_weeks && (
                  <Badge variant="outline">
                    {assignment.programming_templates.duration_weeks} weeks
                  </Badge>
                )}
              </div>
              {assignment.programming_templates?.description && (
                <p className="text-sm pt-1">{assignment.programming_templates.description}</p>
              )}
            </div>

            {/* Adherence analytics */}
            {sLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <AdherencePanel
                showTimeline
                metrics={computeAdherence({
                  startDate: assignment.start_date,
                  sessions: structure?.sessions ?? [],
                  blocks: structure?.blocks ?? [],
                  completionLogs: logs as any,
                })}
              />
            )}

            {/* Outcomes (test data link) */}
            <OutcomesPanel
              athleteId={assignment.athlete_id}
              startDate={assignment.start_date}
              adherencePercentage={
                computeAdherence({
                  startDate: assignment.start_date,
                  sessions: structure?.sessions ?? [],
                  blocks: structure?.blocks ?? [],
                  completionLogs: logs as any,
                }).adherencePercentage
              }
            />

            {/* Adherence quick stats (logged) */}
            <div className="rounded-lg border p-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Sessions logged</div>
                <div className="font-semibold">{sessionsCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Distinct days</div>
                <div className="font-semibold">{uniqueDays}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Last session</div>
                <div className="font-semibold">
                  {lastSession ? format(parseISO(lastSession), 'PP') : '—'}
                </div>
              </div>
            </div>

            {/* Completion history */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Recent completions</div>
                {logs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Showing latest {Math.min(logs.length, 50)}
                  </span>
                )}
              </div>
              {logsError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-muted-foreground">
                    {(logsError as any).message ?? 'Failed to load completion logs.'}
                  </div>
                </div>
              ) : logsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                  No sessions logged yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((l: any) => (
                    <div
                      key={l.id}
                      className="rounded-md border px-3 py-2 text-sm flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {format(parseISO(l.performed_on), 'PP')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {exerciseLabel(l.programming_exercise_id)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[
                            l.sets_completed != null
                              ? `${l.sets_completed}×${l.reps_completed ?? '–'}`
                              : null,
                            l.load_used,
                            l.rpe != null ? `@${l.rpe}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </div>
                        {l.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {l.notes}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeLog(l.id)}
                          aria-label="Remove log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocks (read-only with override badges) */}
            <div>
              <div className="text-sm font-medium mb-2">Programme structure</div>
              {structureError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-muted-foreground">
                    {(structureError as any).message ?? 'Failed to load template structure.'}
                  </div>
                </div>
              ) : sLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (structure?.blocks ?? []).length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                  This template has no blocks yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {structure!.blocks.map((b: any) => (
                    <div key={b.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{b.name}</div>
                        {b.week_number && (
                          <Badge variant="outline" className="text-xs">
                            Week {b.week_number}
                          </Badge>
                        )}
                      </div>
                      {b.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {(exercisesByBlock[b.id] ?? []).length === 0 && (
                          <div className="text-xs text-muted-foreground">No exercises.</div>
                        )}
                        {(exercisesByBlock[b.id] ?? []).map((ex: any) => {
                          const lib = ex.exercise_id ? structure!.library[ex.exercise_id] : null;
                          const ov = overrides[ex.id];
                          const merged = {
                            sets: ov?.sets ?? ex.sets,
                            reps: ov?.reps ?? ex.reps,
                            load: ov?.load ?? ex.load,
                            rpe: ov?.rpe ?? ex.rpe,
                          };
                          return (
                            <div
                              key={ex.id}
                              className="flex items-center justify-between text-sm rounded bg-muted/40 px-2 py-1"
                            >
                              <span className="flex items-center gap-1.5">
                                {lib?.name ?? 'Custom exercise'}
                                {ov && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1 border-amber-500/40 text-amber-700 dark:text-amber-400"
                                  >
                                    overridden
                                  </Badge>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {[
                                  merged.sets ? `${merged.sets}×${merged.reps ?? '–'}` : null,
                                  merged.load,
                                  merged.rpe ? `@${merged.rpe}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!canOverride && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                Per-athlete overrides require <code>can_adjust_sets_reps</code> or{' '}
                <code>can_edit_programming</code>.
              </div>
            )}
          </div>
        )}

        {assignment && (
          <>
            <OverrideEditorDialog
              open={overrideOpen}
              onOpenChange={setOverrideOpen}
              assignmentId={assignment.id}
              athleteId={assignment.athlete_id}
              initialOverrides={overrides}
              blocks={structure?.blocks ?? []}
              exercisesByBlock={exercisesByBlock}
              library={structure?.library ?? {}}
            />
            <LogCompletionDialog
              open={logOpen}
              onOpenChange={setLogOpen}
              assignmentId={assignment.id}
              athleteId={assignment.athlete_id}
              blocks={structure?.blocks ?? []}
              exercisesByBlock={exercisesByBlock}
              library={structure?.library ?? {}}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
