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
  const { hasPermission } = useEffectiveTier();
  const canEditFull = hasPermission('can_edit_programming');
  const canAdjust = canEditFull || hasPermission('can_adjust_sets_reps');
  const canEditField = (field: keyof ExerciseOverride) => {
    if (canEditFull) return true;
    if (!canAdjust) return false;
    return field === 'sets' || field === 'reps' || field === 'load' || field === 'rpe' || field === 'notes';
  };

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
            {!canEditFull && canAdjust && (
              <span className="block mt-1 text-xs">
                Your tier allows adjusting <strong>sets, reps, load, RPE, notes</strong> only.
                Tempo and rest are locked.
              </span>
            )}
            {!canAdjust && (
              <span className="block mt-1 text-xs text-destructive">
                Your tier does not allow adjusting prescriptions.
              </span>
            )}
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
                        const fields: Array<{ key: keyof ExerciseOverride; label: string; type?: 'number' | 'text'; step?: string; min?: number; max?: number }> = [
                          { key: 'sets', label: 'Sets', type: 'number', min: 0 },
                          { key: 'reps', label: 'Reps' },
                          { key: 'load', label: 'Load' },
                          { key: 'tempo', label: 'Tempo' },
                          { key: 'rest_seconds', label: 'Rest (s)', type: 'number', min: 0 },
                          { key: 'rpe', label: 'RPE', type: 'number', step: '0.5', min: 0, max: 10 },
                        ];
                        return (
                          <div key={ex.id} className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                  {lib?.name ?? 'Custom exercise'}
                                  {hasOverride && <Badge className="text-[10px]">Adjusted</Badge>}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Original prescription:{' '}
                                  {[
                                    ex.sets ? `${ex.sets}×${ex.reps ?? '–'}` : null,
                                    ex.load,
                                    ex.tempo ? `tempo ${ex.tempo}` : null,
                                    ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                                    ex.rpe ? `@${ex.rpe}` : null,
                                  ].filter(Boolean).join(' · ') || 'Not prescribed'}
                                </div>
                              </div>
                              {hasOverride && (
                                <Button type="button" size="sm" variant="ghost" onClick={() => reset(ex.id)}>
                                  Reset
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {fields.map((f) => {
                                const allowed = canEditField(f.key);
                                const overridden = ov[f.key] !== undefined && ov[f.key] !== null && ov[f.key] !== '';
                                const original = (ex as any)[f.key];
                                const setVal = (val: any) => setField(ex.id, f.key, val);
                                return (
                                  <div key={f.key as string}>
                                    <Label className={`text-xs flex items-center gap-1 ${overridden ? 'text-primary font-semibold' : ''}`}>
                                      {f.label}
                                      {overridden && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                    </Label>
                                    <Input
                                      type={f.type ?? 'text'}
                                      step={f.step}
                                      min={f.min}
                                      max={f.max}
                                      disabled={!allowed}
                                      value={(ov as any)[f.key] ?? ''}
                                      placeholder={original != null ? String(original) : '—'}
                                      onChange={(e) =>
                                        setVal(f.type === 'number' ? numOrNull(e.target.value) : strOrNull(e.target.value))
                                      }
                                      className={overridden ? 'border-primary' : ''}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div>
                              <Label className={`text-xs flex items-center gap-1 ${ov.notes ? 'text-primary font-semibold' : ''}`}>
                                Notes
                                {ov.notes && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                              </Label>
                              <Textarea
                                rows={2}
                                disabled={!canEditField('notes')}
                                value={ov.notes ?? ''}
                                placeholder={ex.notes ?? 'Athlete-specific notes…'}
                                onChange={(e) => setField(ex.id, 'notes', strOrNull(e.target.value))}
                                className={ov.notes ? 'border-primary' : ''}
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
