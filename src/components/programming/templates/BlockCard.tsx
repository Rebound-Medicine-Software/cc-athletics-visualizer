import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronUp, ChevronDown, Trash2, Plus, Layers } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  usePrescribedExercises,
  useUpdateBlock,
  useDeleteBlock,
  useCreatePrescribed,
  useReorderPrescribed,
} from './useTemplates';
import { PrescribedRow } from './PrescribedRow';
import { ExercisePickerDialog } from './ExercisePickerDialog';
import type { Block } from './types';

interface Props {
  block: Block;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
}

export const BlockCard = ({ block, index, total, disabled, onMove }: Props) => {
  const { data: prescribed, isLoading } = usePrescribedExercises(block.id);
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();
  const createPrescribed = useCreatePrescribed();
  const reorderPrescribed = useReorderPrescribed();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState(block.name);
  const [week, setWeek] = useState(block.week_number?.toString() ?? '');
  const [notes, setNotes] = useState(block.notes ?? '');

  useEffect(() => {
    setName(block.name);
    setWeek(block.week_number?.toString() ?? '');
    setNotes(block.notes ?? '');
  }, [block.id, block.updated_at]);

  const persistBlock = () => {
    if (disabled) return;
    updateBlock.mutate({
      id: block.id,
      name: name.trim() || `Block ${index + 1}`,
      week_number: week ? parseInt(week, 10) || null : null,
      notes: notes.trim() || null,
    });
  };

  const handleMovePrescribed = (i: number, dir: -1 | 1) => {
    if (!prescribed) return;
    const j = i + dir;
    if (j < 0 || j >= prescribed.length) return;
    const next = [...prescribed];
    [next[i], next[j]] = [next[j], next[i]];
    reorderPrescribed.mutate({ blockId: block.id, ordered: next });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2 flex-1">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Block name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={persistBlock}
                disabled={disabled}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Week</label>
              <Input
                value={week}
                onChange={(e) => setWeek(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={persistBlock}
                disabled={disabled}
                placeholder="—"
                className="h-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 pt-5">
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              disabled={disabled || index === total - 1}
              onClick={() => onMove(1)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive"
              disabled={disabled}
              onClick={() => {
                if (confirm(`Delete "${block.name}" and all its exercises?`)) deleteBlock.mutate(block);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={persistBlock}
          disabled={disabled}
          rows={2}
          placeholder="Block notes (optional)"
          className="text-sm"
        />

        {/* Prescribed exercises */}
        <div className="space-y-2 pt-1">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : !prescribed || prescribed.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No exercises in this block yet"
              description="Pick from your Exercise Library to start building."
              inline
              compact
              primaryAction={
                disabled ? undefined : { label: 'Add exercise', onClick: () => setPickerOpen(true), icon: Plus }
              }
            />
          ) : (
            prescribed.map((p, i) => (
              <PrescribedRow
                key={p.id}
                prescribed={p}
                index={i}
                total={prescribed.length}
                disabled={disabled}
                onMove={(dir) => handleMovePrescribed(i, dir)}
              />
            ))
          )}
        </div>

        {prescribed && prescribed.length > 0 && (
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => setPickerOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add exercise
          </Button>
        )}

        <ExercisePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(ex) =>
            createPrescribed.mutate({
              blockId: block.id,
              exerciseId: ex.id,
              position: prescribed?.length ?? 0,
            })
          }
        />
      </CardContent>
    </Card>
  );
};
