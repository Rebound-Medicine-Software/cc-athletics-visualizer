import { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { useClientLogCompletion } from './useClientAssignments';
import { cn } from '@/lib/utils';

const FEELINGS = ['Strong', 'Solid', 'Average', 'Tired', 'Beat up'] as const;
type Feeling = typeof FEELINGS[number];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment: { id: string; team_id: string; athlete_id: string };
  athleteId: string;
  session: { id: string; name: string } | null;
  exerciseCount?: number;
  existingLog?: any | null;
}

const parseSessionMeta = (raw: string | null | undefined): {
  feeling: Feeling;
  pain: number;
  clean: string;
} => {
  if (!raw) return { feeling: 'Solid', pain: 0, clean: '' };
  const feelMatch = raw.match(/Feeling:\s*(Strong|Solid|Average|Tired|Beat up)/i);
  const painMatch = raw.match(/Pain\s+(\d+)\/10/i);
  const feeling = (feelMatch?.[1] as Feeling) ?? 'Solid';
  const pain = painMatch ? Number(painMatch[1]) : 0;
  const clean = raw.includes(' — ')
    ? raw.split(' — ').slice(1).join(' — ').trim()
    : (feelMatch || painMatch ? '' : raw);
  return { feeling, pain: Number.isFinite(pain) ? pain : 0, clean };
};

export const ClientSessionFeedbackSheet = ({
  open,
  onOpenChange,
  assignment,
  athleteId,
  session,
  exerciseCount,
  existingLog,
}: Props) => {
  const [rpe, setRpe] = useState(7);
  const [pain, setPain] = useState(0);
  const [feeling, setFeeling] = useState<Feeling>('Solid');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingLog) {
        setRpe(existingLog.rpe != null ? Number(existingLog.rpe) : 7);
        const parsed = parseSessionMeta(existingLog.notes);
        setFeeling(parsed.feeling);
        setPain(parsed.pain);
        setNotes(parsed.clean);
      } else {
        setRpe(7);
        setPain(0);
        setFeeling('Solid');
        setNotes('');
      }
      setDone(false);
    }
  }, [open, session?.id, existingLog?.id]);

  const mut = useClientLogCompletion();
  if (!session) return null;

  const submit = async () => {
    const meta = [`Feeling: ${feeling}`, pain > 0 ? `Pain ${pain}/10` : 'No pain'].join(' · ');
    const combined = [meta, notes.trim()].filter(Boolean).join(' — ');
    await mut.mutateAsync({
      assignmentId: assignment.id,
      assignmentTeamId: assignment.team_id,
      assignmentAthleteId: assignment.athlete_id,
      athleteId,
      programmingExerciseId: null,
      programmingSessionId: session.id,
      performedOn: new Date().toISOString().slice(0, 10),
      setsCompleted: null,
      repsCompleted: null,
      loadUsed: null,
      rpe,
      notes: combined,
    });
    setDone(true);
    setTimeout(() => onOpenChange(false), 1000);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          'border-0 bg-[#0b0f14]/95 backdrop-blur-2xl text-white',
          'max-h-[88vh] rounded-t-[28px]',
          'before:absolute before:inset-0 before:rounded-t-[28px] before:pointer-events-none',
          'before:bg-[radial-gradient(120%_60%_at_50%_0%,rgba(52,211,153,0.10),transparent_60%)]',
        )}
      >
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
          <DrawerHeader className="px-0 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
                Session complete
              </span>
            </div>
            <DrawerTitle className="mt-1 text-2xl font-semibold text-white">{session.name}</DrawerTitle>
            <DrawerDescription className="text-white/50 text-xs">
              {exerciseCount ? `${exerciseCount} exercises` : 'Quick check-in'} · Tell your practitioner how it went
            </DrawerDescription>
          </DrawerHeader>

          {/* Feeling chips */}
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-2">How are you feeling?</p>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFeeling(f)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm border transition active:scale-95',
                    feeling === f
                      ? 'bg-amber-300 text-[#0b0f14] border-amber-300 font-semibold'
                      : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08]',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* RPE */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">How hard was it?</p>
              <p className="text-xl font-semibold tabular-nums text-amber-300">{rpe}/10</p>
            </div>
            <Slider value={[rpe]} onValueChange={(v) => setRpe(v[0])} min={1} max={10} step={1} className="mt-3" />
          </div>

          {/* Pain */}
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Any pain?</p>
              <p
                className={cn(
                  'text-xl font-semibold tabular-nums',
                  pain === 0 ? 'text-emerald-300' : pain < 5 ? 'text-amber-300' : 'text-red-400',
                )}
              >
                {pain === 0 ? 'None' : `${pain}/10`}
              </p>
            </div>
            <Slider value={[pain]} onValueChange={(v) => setPain(v[0])} min={0} max={10} step={1} className="mt-3" />
          </div>

          {/* Notes */}
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-1.5">
              Notes for your practitioner
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What felt good, what didn't…"
              className="bg-transparent border-0 text-white placeholder:text-white/30 focus-visible:ring-0 px-0"
            />
          </div>

          <div className="sticky bottom-0 pt-4 pb-1 mt-5 bg-gradient-to-t from-[#0b0f14] via-[#0b0f14]/95 to-transparent">
            <Button
              onClick={submit}
              disabled={mut.isPending || done}
              className={cn(
                'w-full h-14 rounded-2xl text-base font-semibold',
                done
                  ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-[#0b0f14] hover:opacity-95',
              )}
            >
              {done ? (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" /> Session marked complete
                </>
              ) : mut.isPending ? (
                'Saving…'
              ) : (
                'Mark session complete'
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
