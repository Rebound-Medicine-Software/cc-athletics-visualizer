import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { TEMPLATE_GOALS, type Template, type TemplateFormValues } from './types';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Max 120 characters'),
  description: z.string().max(2000).optional(),
  goal: z.string().max(60).optional(),
  duration_weeks: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && +v >= 1 && +v <= 104), 'Must be 1–104'),
});

const empty: TemplateFormValues = { name: '', description: '', goal: '', duration_weeks: '' };

const fromTemplate = (t: Template): TemplateFormValues => ({
  name: t.name,
  description: t.description ?? '',
  goal: t.goal ?? '',
  duration_weeks: t.duration_weeks ? String(t.duration_weeks) : '',
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: Template | null;
  onSubmit: (values: TemplateFormValues) => Promise<void> | void;
  submitting?: boolean;
}

export const TemplateFormDialog = ({ open, onOpenChange, template, onSubmit, submitting }: Props) => {
  const [values, setValues] = useState<TemplateFormValues>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(template ? fromTemplate(template) : empty);
      setErrors({});
    }
  }, [open, template]);

  const set = <K extends keyof TemplateFormValues>(k: K, v: TemplateFormValues[K]) =>
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
          <DialogTitle>{template ? 'Edit template' : 'New template'}</DialogTitle>
          <DialogDescription>
            Templates are reusable programmes you can later assign to athletes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Name *</Label>
            <Input id="t-name" value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select value={values.goal || 'none'} onValueChange={(v) => set('goal', v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unspecified</SelectItem>
                  {TEMPLATE_GOALS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-weeks">Duration (weeks)</Label>
              <Input
                id="t-weeks"
                inputMode="numeric"
                value={values.duration_weeks}
                onChange={(e) => set('duration_weeks', e.target.value.replace(/[^\d]/g, ''))}
                placeholder="e.g. 8"
              />
              {errors.duration_weeks && <p className="text-xs text-destructive">{errors.duration_weeks}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : template ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
