import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateAssignmentOverrides } from './useAssignments';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import type { ExerciseOverride } from './types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignmentId: string;
  athleteId: string | null;
  initialOverrides: Record<string, ExerciseOverride>;
  blocks: any[];
  exercisesByBlock: Record<string, any[]>;
  library: Record<string, any>;
}

const numOrNull = (v: string): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const strOrNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export const OverrideEditorDialog = ({
  open,
  onOpenChange,
  assignmentId,
  athleteId,
  initialOverrides,
  blocks,
  exercisesByBlock,
  library,
}: Props) => {
  const [draft, setDraft] = useState<Record<string, ExerciseOverride>>({});
  const mut = useUpdateAssignmentOverrides();
  const guardWrite = useViewAsWriteGuard();

  useEffect(() => {
    if (open) setDraft(JSON.parse(JSON.stringify(initialOverrides ?? {})));
  }, [open, initialOverrides]);

  const setField = (exId: string, field: keyof ExerciseOverride, value: any) => {
    setDraft((prev) => {
      const next = { ...prev };
      const cur = { ...(next[exId] ?? {}) } as ExerciseOverride;
      (cur as any)[field] = value;
      const allEmpty = Object.values(cur).every((v) => v === null || v === undefined || v === '');
      if (allEmpty) delete next[exId];
      else next[exId] = cur;
      return next;
    });
  };

  const reset = (exId: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[exId];
      return next;
    });
  };

  const handleSave = () => {
    if (guardWrite('Saving overrides')) return;
    mut.mutate(
      { id: assignmentId, athleteId, overridePayload: draft },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Per-athlete overrides</DialogTitle>
          <DialogDescription>
            Adjust prescribed values for this athlete. Empty fields fall back to the template.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          {blocks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              This template has no exercises to override.
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((b) => {
                const exs = exercisesByBlock[b.id] ?? [];
                if (exs.length === 0) return null;
                return (
                  <div key={b.id} className="rounded-md border">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                      <div className="font-medium text-sm">{b.name}</div>
                      {b.week_number && (
                        <Badge variant="outline" className="text-xs">
                          Week {b.week_number}
                        </Badge>
                      )}
                    </div>
                    <div className="divide-y">
                      {exs.map((ex: any) => {
                        const lib = ex.exercise_id ? library[ex.exercise_id] : null;
                        const ov = draft[ex.id] ?? {};
                        const hasOverride = Object.keys(ov).length > 0;
                        return (
                          <div key={ex.id} className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium">
                                  {lib?.name ?? 'Custom exercise'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Prescribed:{' '}
                                  {[
                                    ex.sets ? `${ex.sets}×${ex.reps ?? '–'}` : null,
                                    ex.load,
                                    ex.tempo ? `tempo ${ex.tempo}` : null,
                                    ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                                    ex.rpe ? `@${ex.rpe}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                                </div>
                              </div>
                              {hasOverride && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => reset(ex.id)}
                                >
                                  Reset
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Sets</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={ov.sets ?? ''}
                                  placeholder={ex.sets ?? ''}
                                  onChange={(e) =>
                                    setField(ex.id, 'sets', numOrNull(e.target.value))
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Reps</Label>
                                <Input
                                  value={ov.reps ?? ''}
                                  placeholder={ex.reps ?? ''}
                                  onChange={(e) =>
                                    setField(ex.id, 'reps', strOrNull(e.target.value))
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Load</Label>
                                <Input
                                  value={ov.load ?? ''}
                                  placeholder={ex.load ?? ''}
                                  onChange={(e) =>
                                    setField(ex.id, 'load', strOrNull(e.target.value))
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Tempo</Label>
                                <Input
                                  value={ov.tempo ?? ''}
                                  placeholder={ex.tempo ?? ''}
                                  onChange={(e) =>
                                    setField(ex.id, 'tempo', strOrNull(e.target.value))
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Rest (s)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={ov.rest_seconds ?? ''}
                                  placeholder={ex.rest_seconds ?? ''}
                                  onChange={(e) =>
                                    setField(ex.id, 'rest_seconds', numOrNull(e.target.value))
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">RPE</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min={0}
                                  max={10}
                                  value={ov.rpe ?? ''}
                                  placeholder={ex.rpe ?? ''}
                                  onChange={(e) =>
                                    setField(ex.id, 'rpe', numOrNull(e.target.value))
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Notes</Label>
                              <Textarea
                                rows={2}
                                value={ov.notes ?? ''}
                                placeholder={ex.notes ?? 'Athlete-specific notes…'}
                                onChange={(e) =>
                                  setField(ex.id, 'notes', strOrNull(e.target.value))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground">
            {Object.keys(draft).length} exercise{Object.keys(draft).length === 1 ? '' : 's'}{' '}
            overridden.
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mut.isPending}>
            {mut.isPending ? 'Saving…' : 'Save overrides'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
