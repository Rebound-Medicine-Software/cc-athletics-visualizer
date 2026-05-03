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
import { Pause, Play, CheckCircle2, XCircle, Lock } from 'lucide-react';
import {
  useAssignment,
  useTemplateStructure,
  useCompletionSummary,
  useUpdateAssignmentStatus,
} from './useAssignments';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import type { AssignmentStatus } from './types';

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
  const { data: assignment, isLoading } = useAssignment(assignmentId);
  const templateId = assignment?.template_id ?? null;
  const { data: structure, isLoading: sLoading } = useTemplateStructure(templateId);
  const { data: logs = [] } = useCompletionSummary(assignmentId);
  const statusMut = useUpdateAssignmentStatus();

  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const canOverride = hasPermission('can_adjust_sets_reps');
  const guardWrite = useViewAsWriteGuard();

  const exercisesByBlock = useMemo(() => {
    const map: Record<string, any[]> = {};
    (structure?.exercises ?? []).forEach((e) => {
      (map[e.block_id] = map[e.block_id] ?? []).push(e);
    });
    return map;
  }, [structure]);

  const sessionsCount = logs.length;
  const lastSession = logs[0]?.performed_on as string | undefined;

  const setStatus = (next: AssignmentStatus) => {
    if (!assignment) return;
    if (guardWrite('Updating assignment')) return;
    statusMut.mutate({ id: assignment.id, status: next, athleteId: assignment.athlete_id });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assignment details</SheetTitle>
          <SheetDescription>
            Read-only view of the assigned programme structure and athlete progress.
          </SheetDescription>
        </SheetHeader>

        {isLoading || !assignment ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
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
                  <div>{assignment.end_date ? format(parseISO(assignment.end_date), 'PP') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Status actions */}
            <div className="flex flex-wrap gap-2">
              {!canEdit && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Read-only (tier)
                </div>
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

            {/* Adherence */}
            <div className="rounded-lg border p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Sessions logged</div>
                <div className="font-semibold">{sessionsCount}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Last session</div>
                <div className="font-semibold">
                  {lastSession ? format(parseISO(lastSession), 'PP') : '—'}
                </div>
              </div>
            </div>

            {/* Blocks (read-only) */}
            <div>
              <div className="text-sm font-medium mb-2">Programme structure</div>
              {sLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (structure?.blocks ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">
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
                          return (
                            <div
                              key={ex.id}
                              className="flex items-center justify-between text-sm rounded bg-muted/40 px-2 py-1"
                            >
                              <span>{lib?.name ?? 'Custom exercise'}</span>
                              <span className="text-xs text-muted-foreground">
                                {[
                                  ex.sets ? `${ex.sets}×${ex.reps ?? '–'}` : null,
                                  ex.load,
                                  ex.rpe ? `@${ex.rpe}` : null,
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

            {/* Override placeholder */}
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Per-athlete overrides</div>
              {canOverride
                ? 'Override editor coming in PGM6 — your tier allows sets/reps adjustments.'
                : 'Per-athlete overrides require the can_adjust_sets_reps permission.'}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
