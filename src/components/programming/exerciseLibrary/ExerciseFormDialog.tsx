import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Exercise, ExerciseFormValues } from './types';
import { EXERCISE_CATEGORIES } from './types';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Max 120 characters'),
  category: z.string().max(60).optional(),
  primary_muscles: z.string().max(300).optional(),
  equipment: z.string().max(300).optional(),
  video_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), 'Must be a valid URL'),
  instructions: z.string().max(2000).optional(),
});

const empty: ExerciseFormValues = {
  name: '',
  category: '',
  primary_muscles: '',
  equipment: '',
  video_url: '',
  instructions: '',
};

const fromExercise = (ex: Exercise): ExerciseFormValues => ({
  name: ex.name,
  category: ex.category ?? '',
  primary_muscles: (ex.primary_muscles ?? []).join(', '),
  equipment: (ex.equipment ?? []).join(', '),
  video_url: ex.video_url ?? '',
  instructions: ex.instructions ?? '',
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exercise?: Exercise | null;
  onSubmit: (values: ExerciseFormValues) => Promise<void> | void;
  submitting?: boolean;
}

export const ExerciseFormDialog = ({ open, onOpenChange, exercise, onSubmit, submitting }: Props) => {
  const [values, setValues] = useState<ExerciseFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(exercise ? fromExercise(exercise) : empty);
      setErrors({});
    }
  }, [open, exercise]);

  const set = <K extends keyof ExerciseFormValues>(k: K, v: ExerciseFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      return;
    }
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{exercise ? 'Edit exercise' : 'New exercise'}</DialogTitle>
          <DialogDescription>
            Exercises are scoped to your team and reusable across programming templates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">Name *</Label>
            <Input
              id="ex-name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Trap Bar Deadlift"
              maxLength={120}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={values.category || 'none'} onValueChange={(v) => set('category', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorised</SelectItem>
                {EXERCISE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-muscles">Primary muscles</Label>
            <Input
              id="ex-muscles"
              value={values.primary_muscles}
              onChange={(e) => set('primary_muscles', e.target.value)}
              placeholder="Comma separated, e.g. Glutes, Hamstrings"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-equip">Equipment</Label>
            <Input
              id="ex-equip"
              value={values.equipment}
              onChange={(e) => set('equipment', e.target.value)}
              placeholder="Comma separated, e.g. Barbell, Rack"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-video">Video URL</Label>
            <Input
              id="ex-video"
              value={values.video_url}
              onChange={(e) => set('video_url', e.target.value)}
              placeholder="https://..."
              maxLength={500}
            />
            {errors.video_url && <p className="text-xs text-destructive">{errors.video_url}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-inst">Instructions</Label>
            <Textarea
              id="ex-inst"
              value={values.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Coaching cues, setup, common faults..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : exercise ? 'Save changes' : 'Create exercise'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
