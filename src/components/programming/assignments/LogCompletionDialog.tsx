import { useEffect, useState } from 'react';
import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLogCompletion } from './useAssignments';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignmentId: string;
  athleteId: string | null;
  blocks: any[];
  exercisesByBlock: Record<string, any[]>;
  library: Record<string, any>;
}

export const LogCompletionDialog = ({
  open,
  onOpenChange,
  assignmentId,
  athleteId,
  blocks,
  exercisesByBlock,
  library,
}: Props) => {
  const [exerciseId, setExerciseId] = useState<string>('session');
  const [performedOn, setPerformedOn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [setsCompleted, setSetsCompleted] = useState('');
  const [repsCompleted, setRepsCompleted] = useState('');
  const [loadUsed, setLoadUsed] = useState('');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');
  const mut = useLogCompletion();
  const guardWrite = useViewAsWriteGuard();

  useEffect(() => {
    if (open) {
      setExerciseId('session');
      setPerformedOn(format(new Date(), 'yyyy-MM-dd'));
      setSetsCompleted('');
      setRepsCompleted('');
      setLoadUsed('');
      setRpe('');
      setNotes('');
    }
  }, [open]);

  const submit = () => {
    if (guardWrite('Logging completion')) return;
    if (!performedOn) return;
    mut.mutate(
      {
        assignmentId,
        athleteId,
        programmingExerciseId: exerciseId === 'session' ? null : exerciseId,
        performedOn,
        setsCompleted: setsCompleted === '' ? null : Number(setsCompleted),
        repsCompleted: repsCompleted.trim() || null,
        loadUsed: loadUsed.trim() || null,
        rpe: rpe === '' ? null : Number(rpe),
        notes: notes.trim() || null,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log completion</DialogTitle>
          <DialogDescription>
            Record a completed session or single exercise for this assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Exercise</Label>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">Whole session (no specific exercise)</SelectItem>
                {blocks.map((b) => {
                  const exs = exercisesByBlock[b.id] ?? [];
                  if (!exs.length) return null;
                  return exs.map((ex: any) => {
                    const lib = ex.exercise_id ? library[ex.exercise_id] : null;
                    return (
                      <SelectItem key={ex.id} value={ex.id}>
                        {b.name} — {lib?.name ?? 'Custom exercise'}
                      </SelectItem>
                    );
                  });
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Performed on</Label>
            <Input
              type="date"
              value={performedOn}
              onChange={(e) => setPerformedOn(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sets completed</Label>
              <Input
                type="number"
                min={0}
                value={setsCompleted}
                onChange={(e) => setSetsCompleted(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Reps completed</Label>
              <Input
                value={repsCompleted}
                placeholder="e.g. 5,5,4"
                onChange={(e) => setRepsCompleted(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Load used</Label>
              <Input
                value={loadUsed}
                placeholder="e.g. 80kg"
                onChange={(e) => setLoadUsed(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">RPE</Label>
              <Input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending || !performedOn}>
            {mut.isPending ? 'Logging…' : 'Log session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
