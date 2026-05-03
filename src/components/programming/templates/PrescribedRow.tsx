import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
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
      const { data } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', exerciseId!)
        .maybeSingle();
      return data?.name ?? 'Unknown exercise';
    },
  });

export const PrescribedRow = ({ prescribed, index, total, disabled, onMove }: Props) => {
  const { data: exerciseName } = useExerciseName(prescribed.exercise_id);
  const updateMut = useUpdatePrescribed();
  const deleteMut = useDeletePrescribed();

  // Local state for debounced text/number fields
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

  const persist = () => {
    if (disabled) return;
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

  return (
    <div className="rounded-md border p-3 space-y-2 bg-background">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground mr-2">#{index + 1}</span>
          <span className="font-medium">{exerciseName ?? '...'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
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
            onClick={() => deleteMut.mutate(prescribed)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Field label="Sets" value={local.sets} onChange={(v) => setLocal({ ...local, sets: v.replace(/[^\d]/g, '') })} onBlur={persist} disabled={disabled} />
        <Field label="Reps" value={local.reps} onChange={(v) => setLocal({ ...local, reps: v })} onBlur={persist} disabled={disabled} placeholder="e.g. 8-10" />
        <Field label="Load" value={local.load} onChange={(v) => setLocal({ ...local, load: v })} onBlur={persist} disabled={disabled} placeholder="e.g. 70%" />
        <Field label="Tempo" value={local.tempo} onChange={(v) => setLocal({ ...local, tempo: v })} onBlur={persist} disabled={disabled} placeholder="e.g. 3-1-1" />
        <Field label="Rest (s)" value={local.rest_seconds} onChange={(v) => setLocal({ ...local, rest_seconds: v.replace(/[^\d]/g, '') })} onBlur={persist} disabled={disabled} />
        <Field label="RPE" value={local.rpe} onChange={(v) => setLocal({ ...local, rpe: v.replace(/[^\d.]/g, '') })} onBlur={persist} disabled={disabled} placeholder="0–10" />
      </div>
      <Input
        value={local.notes}
        onChange={(e) => setLocal({ ...local, notes: e.target.value })}
        onBlur={persist}
        disabled={disabled}
        placeholder="Coaching notes (optional)"
        className="text-sm"
      />
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  onBlur,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      className="h-8 text-sm"
    />
  </div>
);
