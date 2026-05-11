import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import {
  useRetestInterval,
  useUpdateRetestInterval,
  DEFAULT_RETEST_INTERVAL_DAYS,
  MIN_RETEST_INTERVAL_DAYS,
  MAX_RETEST_INTERVAL_DAYS,
} from '@/hooks/useRetestInterval';

const PRESETS = [
  { label: '2 weeks', days: 14 },
  { label: '4 weeks', days: 28 },
  { label: '6 weeks', days: 42 },
  { label: '8 weeks', days: 56 },
  { label: '12 weeks', days: 84 },
];

export const RetestSettingsTab = () => {
  const { teamId } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const { data: current, isLoading } = useRetestInterval(teamId);
  const update = useUpdateRetestInterval(teamId);

  const [draft, setDraft] = useState<number>(DEFAULT_RETEST_INTERVAL_DAYS);

  useEffect(() => {
    if (typeof current === 'number') setDraft(current);
  }, [current]);

  const isPreset = useMemo(() => PRESETS.some((p) => p.days === draft), [draft]);
  const dirty = current != null && draft !== current;

  const save = () => {
    if (guardWrite('Update retest interval')) return;
    if (draft < MIN_RETEST_INTERVAL_DAYS || draft > MAX_RETEST_INTERVAL_DAYS) {
      toast.error(`Choose between ${MIN_RETEST_INTERVAL_DAYS} and ${MAX_RETEST_INTERVAL_DAYS} days.`);
      return;
    }
    update.mutate(draft, {
      onSuccess: () => toast.success(`Retest interval set to ${draft} days`),
      onError: (e: any) => toast.error(e.message ?? 'Could not update'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Retest interval
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Controls when athletes are prompted to re-test after their last assessment.
        </p>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={draft === p.days ? 'default' : 'outline'}
              onClick={() => setDraft(p.days)}
              disabled={isLoading}
            >
              {p.label} <span className="ml-1 text-xs opacity-70">({p.days}d)</span>
            </Button>
          ))}
          <Button
            size="sm"
            variant={!isPreset ? 'default' : 'outline'}
            onClick={() => {
              if (isPreset) setDraft(draft);
            }}
            disabled={isLoading}
          >
            Custom
          </Button>
        </div>

        <div className="flex items-end gap-2 max-w-xs">
          <div className="flex-1">
            <Label htmlFor="retest-days" className="text-xs">Days</Label>
            <Input
              id="retest-days"
              type="number"
              min={MIN_RETEST_INTERVAL_DAYS}
              max={MAX_RETEST_INTERVAL_DAYS}
              value={draft}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) setDraft(v);
              }}
              disabled={isLoading}
            />
          </div>
          <Button onClick={save} disabled={!dirty || update.isPending} className="gap-1">
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Allowed range: {MIN_RETEST_INTERVAL_DAYS}–{MAX_RETEST_INTERVAL_DAYS} days. Default: {DEFAULT_RETEST_INTERVAL_DAYS} days.
        </p>
      </CardContent>
    </Card>
  );
};
