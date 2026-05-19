import { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Minus, Plus, PlayCircle, CheckCircle2, Sparkles, Dumbbell, Flame, Target } from 'lucide-react';
import { useClientLogCompletion } from './useClientAssignments';
import { toEmbedUrl } from '../shared/VideoPreviewButton';
import { cn } from '@/lib/utils';

interface PrescribedExercise {
  id: string;
  name: string;
  category?: string | null;
  sets?: number | null;
  reps?: string | null;
  load?: string | null;
  rpe?: number | null;
  rest_seconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  video_url?: string | null;
  instructions?: string | null;
  primary_muscles?: string[] | null;
  equipment?: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment: { id: string; team_id: string; athlete_id: string };
  athleteId: string;
  exercise: PrescribedExercise | null;
  readOnly?: boolean;
}

const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div
    className={cn(
      'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 py-2.5 text-center',
      accent && 'border-amber-400/30 bg-amber-400/[0.06]',
    )}
  >
    <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{label}</p>
    <p className={cn('mt-0.5 text-lg font-semibold tabular-nums text-white', accent && 'text-amber-300')}>
      {value}
    </p>
  </div>
);

const NumberStepper = ({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  suffix?: string;
}) => {
  const num = parseFloat(value);
  const isNum = !Number.isNaN(num);
  const set = (n: number) => onChange(String(Math.max(min, n)));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => set((isNum ? num : 0) - step)}
          className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/80 active:scale-95 transition flex items-center justify-center"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent text-center text-2xl font-semibold tabular-nums text-white outline-none"
          />
          {suffix && <p className="text-[10px] text-white/40 -mt-1">{suffix}</p>}
        </div>
        <button
          type="button"
          onClick={() => set((isNum ? num : 0) + step)}
          className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white/80 active:scale-95 transition flex items-center justify-center"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const ClientExerciseSheet = ({
  open,
  onOpenChange,
  assignment,
  athleteId,
  exercise,
  readOnly,
}: Props) => {
  const today = new Date().toISOString().slice(0, 10);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [rpe, setRpe] = useState<number>(7);
  const [pain, setPain] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [justLogged, setJustLogged] = useState(false);

  useEffect(() => {
    if (open && exercise) {
      setSets(exercise.sets ? String(exercise.sets) : '');
      setReps(exercise.reps ?? '');
      setLoad(exercise.load ?? '');
      setRpe(exercise.rpe ?? 7);
      setPain(0);
      setNotes('');
      setJustLogged(false);
    }
  }, [open, exercise?.id]);

  const mut = useClientLogCompletion();
  const embed = useMemo(() => (exercise?.video_url ? toEmbedUrl(exercise.video_url) : null), [exercise?.video_url]);

  if (!exercise) return null;

  const submit = async () => {
    const meta: string[] = [];
    if (pain > 0) meta.push(`Pain ${pain}/10`);
    const combinedNotes = [meta.join(' · '), notes.trim()].filter(Boolean).join(' — ');
    await mut.mutateAsync({
      assignmentId: assignment.id,
      assignmentTeamId: assignment.team_id,
      assignmentAthleteId: assignment.athlete_id,
      athleteId,
      programmingExerciseId: exercise.id,
      programmingSessionId: null,
      performedOn: today,
      setsCompleted: sets ? Number(sets) : null,
      repsCompleted: reps || null,
      loadUsed: load || null,
      rpe: rpe ? Number(rpe) : null,
      notes: combinedNotes || null,
    });
    setJustLogged(true);
    setTimeout(() => onOpenChange(false), 900);
  };

  const muscles = exercise.primary_muscles?.filter(Boolean) ?? [];
  const equipment = exercise.equipment?.filter(Boolean) ?? [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          'border-0 bg-[#0b0f14]/95 backdrop-blur-2xl text-white',
          'max-h-[92vh] rounded-t-[28px] shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.6)]',
          'before:absolute before:inset-0 before:rounded-t-[28px] before:pointer-events-none',
          'before:bg-[radial-gradient(120%_60%_at_50%_0%,rgba(212,175,90,0.10),transparent_60%)]',
        )}
      >
        <div className="relative overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
          <DrawerHeader className="px-0 pt-3 pb-2">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {exercise.category && (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                      {exercise.category}
                    </span>
                  )}
                </div>
                <DrawerTitle className="mt-1 text-2xl font-semibold leading-tight text-white">
                  {exercise.name}
                </DrawerTitle>
                <DrawerDescription className="text-white/50 text-xs mt-1">
                  Prescribed by your practitioner
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          {/* Video / placeholder */}
          <div className="mt-1 overflow-hidden rounded-2xl border border-white/10 bg-black/60 aspect-video">
            {embed ? (
              <iframe
                src={embed}
                title={exercise.name}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-14 w-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3">
                  <PlayCircle className="h-7 w-7 text-amber-300/70" />
                </div>
                <p className="text-sm font-medium text-white/90">Demo video coming soon</p>
                <p className="text-xs text-white/40 mt-1">
                  Your practitioner can add a demo video for this exercise.
                </p>
              </div>
            )}
          </div>

          {/* Prescription stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatCard label="Sets" value={exercise.sets ? String(exercise.sets) : '–'} />
            <StatCard label="Reps" value={exercise.reps ?? '–'} />
            <StatCard label="Load" value={exercise.load ?? '–'} accent={!!exercise.load} />
            <StatCard label="RPE" value={exercise.rpe ? String(exercise.rpe) : '–'} />
          </div>
          {(exercise.tempo || exercise.rest_seconds) && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/60">
              {exercise.tempo && (
                <span className="rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-1">
                  Tempo {exercise.tempo}
                </span>
              )}
              {exercise.rest_seconds && (
                <span className="rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-1">
                  Rest {exercise.rest_seconds}s
                </span>
              )}
            </div>
          )}

          {/* Coaching cues */}
          <section className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300/80" />
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-white/60">Coaching cues</h4>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/80">
              {exercise.instructions?.trim() ? (
                <p className="whitespace-pre-wrap">{exercise.instructions}</p>
              ) : (
                <p className="text-white/40 italic">
                  No coaching cues yet. Focus on controlled tempo and quality reps.
                </p>
              )}
              {exercise.notes && (
                <p className="mt-3 pt-3 border-t border-white/10 text-xs text-amber-200/80">
                  <span className="text-amber-300/80">Practitioner note:</span> {exercise.notes}
                </p>
              )}
            </div>
            {(muscles.length > 0 || equipment.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {muscles.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/50">
                      <Target className="h-3 w-3" /> Focus
                    </div>
                    <p className="mt-1 text-xs text-white/80 capitalize">{muscles.join(', ')}</p>
                  </div>
                )}
                {equipment.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/50">
                      <Dumbbell className="h-3 w-3" /> Equipment
                    </div>
                    <p className="mt-1 text-xs text-white/80 capitalize">{equipment.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Logging */}
          {!readOnly && (
            <section className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-3.5 w-3.5 text-amber-300/80" />
                <h4 className="text-[11px] uppercase tracking-[0.16em] text-white/60">Log what you did</h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <NumberStepper label="Sets" value={sets} onChange={setSets} />
                <NumberStepper label="Reps" value={reps} onChange={setReps} />
              </div>
              <div className="mt-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Load used</p>
                  <input
                    value={load}
                    onChange={(e) => setLoad(e.target.value)}
                    placeholder="e.g. 60kg, BW, band"
                    className="mt-1 w-full bg-transparent text-lg font-medium text-white placeholder:text-white/30 outline-none"
                  />
                </div>
              </div>

              {/* RPE slider */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Effort (RPE)</p>
                  <p className="text-xl font-semibold tabular-nums text-amber-300">{rpe}</p>
                </div>
                <Slider
                  value={[rpe]}
                  onValueChange={(v) => setRpe(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-3"
                />
                <div className="mt-1.5 flex justify-between text-[10px] text-white/40">
                  <span>Easy</span>
                  <span>Maximal</span>
                </div>
              </div>

              {/* Pain */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Pain</p>
                  <p
                    className={cn(
                      'text-xl font-semibold tabular-nums',
                      pain === 0 ? 'text-emerald-300' : pain < 5 ? 'text-amber-300' : 'text-red-400',
                    )}
                  >
                    {pain === 0 ? 'None' : `${pain}/10`}
                  </p>
                </div>
                <Slider
                  value={[pain]}
                  onValueChange={(v) => setPain(v[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="mt-3"
                />
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
                  placeholder="Felt strong, full range of motion…"
                  className="bg-transparent border-0 text-white placeholder:text-white/30 focus-visible:ring-0 px-0"
                />
              </div>

              <div className="sticky bottom-0 left-0 right-0 pt-4 pb-1 mt-5 bg-gradient-to-t from-[#0b0f14] via-[#0b0f14]/95 to-transparent">
                <Button
                  onClick={submit}
                  disabled={mut.isPending || justLogged}
                  className={cn(
                    'w-full h-14 rounded-2xl text-base font-semibold transition-all',
                    justLogged
                      ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-amber-300 to-amber-500 text-[#0b0f14] hover:opacity-95',
                  )}
                >
                  {justLogged ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" /> Exercise logged
                    </>
                  ) : mut.isPending ? (
                    'Saving…'
                  ) : (
                    'Log exercise'
                  )}
                </Button>
              </div>
            </section>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
