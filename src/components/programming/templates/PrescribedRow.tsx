import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, ChevronUp, ChevronDown, ChevronRight, Pencil, Zap, AlertTriangle } from 'lucide-react';
import { useUpdatePrescribed, useDeletePrescribed } from './useTemplates';
import type { PrescribedExercise } from './types';

interface Props {
  prescribed: PrescribedExercise;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
}

const useExerciseName = (exerciseId: string | null) =>
  useQuery({
    queryKey: ['exercise-name', exerciseId],
    enabled: !!exerciseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('exercises').select('name').eq('id', exerciseId!).maybeSingle();
      return data?.name ?? 'Unknown exercise';
    },
  });

const PRESETS: Record<string, { label: string; sets: string; reps: string; rpe: string; rest: string }> = {
  strength:    { label: 'Strength',    sets: '4', reps: '5',     rpe: '8',   rest: '180' },
  hypertrophy: { label: 'Hypertrophy', sets: '4', reps: '8-12',  rpe: '7',   rest: '90'  },
  power:       { label: 'Power',       sets: '4', reps: '3',     rpe: '7',   rest: '180' },
  control:     { label: 'Rehab/Control', sets: '3', reps: '10-15', rpe: '6', rest: '60'  },
};

const summarise = (p: { sets?: string; reps?: string; load?: string; tempo?: string; rest?: string; rpe?: string }) => {
  const parts = [
    p.sets || p.reps ? `${p.sets || '–'} × ${p.reps || '–'}` : null,
    p.load ? `@ ${p.load}` : null,
    p.tempo ? `tempo ${p.tempo}` : null,
    p.rest ? `${p.rest}s rest` : null,
    p.rpe ? `RPE ${p.rpe}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Not prescribed';
};

export const PrescribedRow = ({ prescribed, index, total, disabled, onMove }: Props) => {
  const { data: exerciseName } = useExerciseName(prescribed.exercise_id);
  const updateMut = useUpdatePrescribed();
  const deleteMut = useDeletePrescribed();

  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState({
    sets: prescribed.sets?.toString() ?? '',
    reps: prescribed.reps ?? '',
    load: prescribed.load ?? '',
    tempo: prescribed.tempo ?? '',
    rest_seconds: prescribed.rest_seconds?.toString() ?? '',
    rpe: prescribed.rpe?.toString() ?? '',
    notes: prescribed.notes ?? '',
  });

  useEffect(() => {
    setLocal({
      sets: prescribed.sets?.toString() ?? '',
      reps: prescribed.reps ?? '',
      load: prescribed.load ?? '',
      tempo: prescribed.tempo ?? '',
      rest_seconds: prescribed.rest_seconds?.toString() ?? '',
      rpe: prescribed.rpe?.toString() ?? '',
      notes: prescribed.notes ?? '',
    });
  }, [prescribed.id, prescribed.updated_at]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (local.sets && (parseInt(local.sets, 10) < 1 || parseInt(local.sets, 10) > 20)) e.sets = '1–20';
    if (local.rpe) {
      const n = parseFloat(local.rpe);
      if (!(n >= 0 && n <= 10)) e.rpe = '0–10';
    }
    if (local.rest_seconds && parseInt(local.rest_seconds, 10) > 1800) e.rest_seconds = '≤ 1800s';
    return e;
  }, [local]);

  const persist = () => {
    if (disabled) return;
    if (Object.keys(errors).length) return;
    updateMut.mutate({
      id: prescribed.id,
      sets: local.sets ? parseInt(local.sets, 10) || null : null,
      reps: local.reps || null,
      load: local.load || null,
      tempo: local.tempo || null,
      rest_seconds: local.rest_seconds ? parseInt(local.rest_seconds, 10) || null : null,
      rpe: local.rpe ? parseFloat(local.rpe) || null : null,
      notes: local.notes || null,
    });
  };

  const applyPreset = (key: keyof typeof PRESETS) => {
    if (disabled) return;
    const p = PRESETS[key];
    const next = { ...local, sets: p.sets, reps: p.reps, rpe: p.rpe, rest_seconds: p.rest };
    setLocal(next);
    updateMut.mutate({
      id: prescribed.id,
      sets: parseInt(p.sets, 10),
      reps: p.reps,
      rpe: parseFloat(p.rpe),
      rest_seconds: parseInt(p.rest, 10),
      load: local.load || null,
      tempo: local.tempo || null,
      notes: local.notes || null,
    });
  };

  const summary = summarise({
    sets: local.sets, reps: local.reps, load: local.load,
    tempo: local.tempo, rest: local.rest_seconds, rpe: local.rpe,
  });
  const isUnprescribed = summary === 'Not prescribed';

  return (
    <div className="rounded-md border bg-background">
      {/* Compact row */}
      <div className="flex items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left flex items-start gap-2 group"
        >
          <ChevronRight className={`h-4 w-4 mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''} text-muted-foreground`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">#{index + 1}</span>
              <span className="font-medium truncate">{exerciseName ?? '...'}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground truncate">
              {isUnprescribed ? (
                <span className="italic">Not prescribed — click to set Training Prescription</span>
              ) : (
                summary
              )}
              {local.notes && !expanded && <span className="ml-2 italic">· {local.notes}</span>}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled || index === total - 1} onClick={() => onMove(1)}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled} onClick={() => setExpanded((v) => !v)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" disabled={disabled} onClick={() => deleteMut.mutate(prescribed)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t p-3 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Training Prescription
            </p>
            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((k) => (
                  <Tooltip key={k}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={disabled}
                        onClick={() => applyPreset(k)}
                      >
                        <Zap className="h-3 w-3 mr-1" /> {PRESETS[k].label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {PRESETS[k].sets} × {PRESETS[k].reps} · RPE {PRESETS[k].rpe} · {PRESETS[k].rest}s rest
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Field label="Sets" value={local.sets} placeholder="—"
              error={errors.sets}
              onChange={(v) => setLocal({ ...local, sets: v.replace(/[^\d]/g, '') })} onBlur={persist} disabled={disabled} />
            <Field label="Reps" value={local.reps} placeholder="e.g. 8-10"
              onChange={(v) => setLocal({ ...local, reps: v })} onBlur={persist} disabled={disabled} />
            <Field label="Load" value={local.load} placeholder="e.g. 70% / 60kg / BW"
              onChange={(v) => setLocal({ ...local, load: v })} onBlur={persist} disabled={disabled} />
            <Field label="Tempo" value={local.tempo} placeholder="e.g. 3-1-1"
              onChange={(v) => setLocal({ ...local, tempo: v })} onBlur={persist} disabled={disabled} />
            <Field label="Rest (s)" value={local.rest_seconds} placeholder="—"
              error={errors.rest_seconds}
              onChange={(v) => setLocal({ ...local, rest_seconds: v.replace(/[^\d]/g, '') })} onBlur={persist} disabled={disabled} />
            <Field label="RPE (0–10)" value={local.rpe} placeholder="—"
              error={errors.rpe}
              onChange={(v) => setLocal({ ...local, rpe: v.replace(/[^\d.]/g, '') })} onBlur={persist} disabled={disabled} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Coaching notes & cues</label>
            <Textarea
              value={local.notes}
              onChange={(e) => setLocal({ ...local, notes: e.target.value })}
              onBlur={persist}
              disabled={disabled}
              placeholder="Cues, progression notes, regressions…"
              rows={2}
              className="text-sm"
            />
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" /> Fix highlighted fields before they save.
            </div>
          )}

          {!isUnprescribed && (
            <Badge variant="outline" className="text-[10px]">Prescribed</Badge>
          )}
        </div>
      )}
    </div>
  );
};

const Field = ({
  label, value, onChange, onBlur, disabled, placeholder, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
      {label} {error && <span className="text-destructive normal-case">({error})</span>}
    </label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={`h-8 text-sm ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
    />
  </div>
);
