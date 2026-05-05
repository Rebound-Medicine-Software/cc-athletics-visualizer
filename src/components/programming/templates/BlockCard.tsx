import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, Trash2, Plus, Layers, CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  usePrescribedExercises,
  useUpdateBlock,
  useDeleteBlock,
  useCreatePrescribed,
  useReorderPrescribed,
  useSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useReorderSessions,
} from './useTemplates';
import { PrescribedRow } from './PrescribedRow';
import { ExercisePickerDialog } from './ExercisePickerDialog';
import type { Block, ProgrammingSession, PrescribedExercise } from './types';

interface Props {
  block: Block;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
}

export const BlockCard = ({ block, index, total, disabled, onMove }: Props) => {
  const { data: prescribed, isLoading } = usePrescribedExercises(block.id);
  const { data: sessions, isLoading: sessionsLoading } = useSessions(block.id);
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();
  const createPrescribed = useCreatePrescribed();
  const reorderPrescribed = useReorderPrescribed();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const reorderSessions = useReorderSessions();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSessionId, setPickerSessionId] = useState<string | null>(null);
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

  const grouped = useMemo(() => {
    const bySession: Record<string, PrescribedExercise[]> = {};
    const unscheduled: PrescribedExercise[] = [];
    (prescribed ?? []).forEach((p) => {
      if (p.session_id) (bySession[p.session_id] = bySession[p.session_id] ?? []).push(p);
      else unscheduled.push(p);
    });
    return { bySession, unscheduled };
  }, [prescribed]);

  const handleMoveInList = (list: PrescribedExercise[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    reorderPrescribed.mutate({ blockId: block.id, ordered: next });
  };

  const openPicker = (sessionId: string | null) => {
    setPickerSessionId(sessionId);
    setPickerOpen(true);
  };

  const handleAddSession = () => {
    if (disabled) return;
    const nextOffset = sessions && sessions.length > 0
      ? Math.max(...sessions.map((s) => s.day_offset)) + 1
      : 0;
    createSession.mutate({ blockId: block.id, position: sessions?.length ?? 0, dayOffset: nextOffset });
  };

  const moveSession = (i: number, dir: -1 | 1) => {
    if (!sessions) return;
    const j = i + dir;
    if (j < 0 || j >= sessions.length) return;
    const next = [...sessions];
    [next[i], next[j]] = [next[j], next[i]];
    reorderSessions.mutate({ blockId: block.id, ordered: next });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2 flex-1">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Block name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={persistBlock} disabled={disabled} className="h-8" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Week</label>
              <Input value={week} onChange={(e) => setWeek(e.target.value.replace(/[^\d]/g, ''))} onBlur={persistBlock} disabled={disabled} placeholder="—" className="h-8" />
            </div>
          </div>
          <div className="flex items-center gap-1 pt-5">
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" disabled={disabled}
              onClick={() => { if (confirm(`Delete "${block.name}" and all its exercises?`)) deleteBlock.mutate(block); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={persistBlock} disabled={disabled} rows={2} placeholder="Block notes (optional)" className="text-sm" />

        {/* Sessions */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Sessions
            </h4>
            <Button size="sm" variant="outline" disabled={disabled} onClick={handleAddSession}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add session
            </Button>
          </div>

          {sessionsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : sessions && sessions.length > 0 ? (
            sessions.map((s, si) => {
              const list = grouped.bySession[s.id] ?? [];
              return (
                <SessionEditor
                  key={s.id}
                  session={s}
                  index={si}
                  total={sessions.length}
                  disabled={disabled}
                  exercises={list}
                  onMove={(dir) => moveSession(si, dir)}
                  onSave={(patch) => updateSession.mutate({ id: s.id, ...patch })}
                  onDelete={() => { if (confirm(`Delete session "${s.name}"? Exercises will become unscheduled.`)) deleteSession.mutate(s); }}
                  onAddExercise={() => openPicker(s.id)}
                  onMoveExercise={(i, dir) => handleMoveInList(list, i, dir)}
                />
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No sessions yet — add one to schedule exercises by day, or add exercises below for an unscheduled programme.
            </p>
          )}
        </div>

        {/* Unscheduled / legacy exercises */}
        <div className="space-y-2 pt-3 border-t">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> Unscheduled exercises
          </h4>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : grouped.unscheduled.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No unscheduled exercises"
              description="Pick from your Exercise Library to add exercises directly to this block."
              inline
              compact
              primaryAction={disabled ? undefined : { label: 'Add exercise', onClick: () => openPicker(null), icon: Plus }}
            />
          ) : (
            grouped.unscheduled.map((p, i) => (
              <PrescribedRow
                key={p.id}
                prescribed={p}
                index={i}
                total={grouped.unscheduled.length}
                disabled={disabled}
                onMove={(dir) => handleMoveInList(grouped.unscheduled, i, dir)}
              />
            ))
          )}
          {grouped.unscheduled.length > 0 && (
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => openPicker(null)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add unscheduled exercise
            </Button>
          )}
        </div>

        <ExercisePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(ex) =>
            createPrescribed.mutate({
              blockId: block.id,
              exerciseId: ex.id,
              position: prescribed?.length ?? 0,
              sessionId: pickerSessionId,
            })
          }
        />
      </CardContent>
    </Card>
  );
};

interface SessionEditorProps {
  session: ProgrammingSession;
  index: number;
  total: number;
  disabled: boolean;
  exercises: PrescribedExercise[];
  onMove: (dir: -1 | 1) => void;
  onSave: (patch: Partial<ProgrammingSession>) => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onMoveExercise: (i: number, dir: -1 | 1) => void;
}

const SessionEditor = ({
  session, index, total, disabled, exercises, onMove, onSave, onDelete, onAddExercise, onMoveExercise,
}: SessionEditorProps) => {
  const [name, setName] = useState(session.name);
  const [day, setDay] = useState(session.day_offset.toString());
  const [notes, setNotes] = useState(session.notes ?? '');

  useEffect(() => {
    setName(session.name);
    setDay(session.day_offset.toString());
    setNotes(session.notes ?? '');
  }, [session.id, session.updated_at]);

  const persist = () => {
    if (disabled) return;
    onSave({
      name: name.trim() || `Day ${session.day_offset + 1}`,
      day_offset: parseInt(day, 10) || 0,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-2 flex-1">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Session name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={persist} disabled={disabled} className="h-8" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Day offset</label>
            <Input value={day} onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, ''))} onBlur={persist} disabled={disabled} className="h-8" />
          </div>
        </div>
        <div className="flex items-center gap-1 pt-5">
          <Badge variant="outline" className="text-[10px]">D+{session.day_offset}</Badge>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" disabled={disabled} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={persist} disabled={disabled} rows={2} placeholder="Session notes (optional)" className="text-sm" />

      <div className="space-y-2">
        {exercises.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No exercises in this session yet.</p>
        ) : (
          exercises.map((p, i) => (
            <PrescribedRow
              key={p.id}
              prescribed={p}
              index={i}
              total={exercises.length}
              disabled={disabled}
              onMove={(dir) => onMoveExercise(i, dir)}
            />
          ))
        )}
        <Button variant="outline" size="sm" disabled={disabled} onClick={onAddExercise}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add exercise to session
        </Button>
      </div>
    </div>
  );
};
