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
import { useClientLogCompletion } from './useClientAssignments';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment: { id: string; team_id: string; athlete_id: string };
  athleteId: string;
  exercise?: {
    id: string;
    name: string;
    sets?: number | null;
    reps?: string | null;
    load?: string | null;
  } | null;
  session?: { id: string; name: string } | null;
}

export const ClientLogCompletionDialog = ({
  open,
  onOpenChange,
  assignment,
  athleteId,
  exercise,
  session,
}: Props) => {
  const today = new Date().toISOString().slice(0, 10);
  const [performedOn, setPerformedOn] = useState(today);
  const [sets, setSets] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [load, setLoad] = useState<string>('');
  const [rpe, setRpe] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setPerformedOn(today);
      setSets(exercise?.sets ? String(exercise.sets) : '');
      setReps(exercise?.reps ?? '');
      setLoad(exercise?.load ?? '');
      setRpe('');
      setNotes('');
    }
  }, [open, exercise?.id, session?.id]);

  const mut = useClientLogCompletion();

  const submit = async () => {
    await mut.mutateAsync({
      assignmentId: assignment.id,
      assignmentTeamId: assignment.team_id,
      assignmentAthleteId: assignment.athlete_id,
      athleteId,
      programmingExerciseId: exercise?.id ?? null,
      programmingSessionId: session?.id ?? null,
      performedOn,
      setsCompleted: sets ? Number(sets) : null,
      repsCompleted: reps || null,
      loadUsed: load || null,
      rpe: rpe ? Number(rpe) : null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log session</DialogTitle>
          <DialogDescription>
            {exercise ? exercise.name : 'Whole session'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label>Date</Label>
            <Input type="date" value={performedOn} onChange={(e) => setPerformedOn(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Sets completed</Label>
              <Input value={sets} onChange={(e) => setSets(e.target.value)} placeholder="3" />
            </div>
            <div className="grid gap-1">
              <Label>Reps completed</Label>
              <Input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8" />
            </div>
            <div className="grid gap-1">
              <Label>Load used</Label>
              <Input value={load} onChange={(e) => setLoad(e.target.value)} placeholder="60kg" />
            </div>
            <div className="grid gap-1">
              <Label>RPE</Label>
              <Input value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="7" />
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Saving…' : 'Log session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
