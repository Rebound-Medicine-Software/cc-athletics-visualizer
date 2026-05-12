import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SportsSelector } from './SportsSelector';
import { SPORT_BUNDLES, canonicalSports } from '@/lib/sports/normalize';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';

interface BulkSportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteIds: string[];
  /** Map of athleteId -> current sports array, used for add/remove modes */
  currentSportsById: Record<string, string[] | undefined>;
  options: string[];
  onApplied: () => void;
}

type Mode = 'add' | 'remove' | 'overwrite';

export const BulkSportsDialog = ({
  open, onOpenChange, athleteIds, currentSportsById, options, onApplied,
}: BulkSportsDialogProps) => {
  const [mode, setMode] = useState<Mode>('add');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const guardWrite = useViewAsWriteGuard();

  const reset = () => {
    setMode('add');
    setTags([]);
  };

  const applyBundle = (bundle: string[]) => {
    setTags((prev) => Array.from(new Set([...prev, ...bundle])));
  };

  const handleApply = async () => {
    if (guardWrite('Bulk sports update')) return;
    if (athleteIds.length === 0) {
      toast.error('No athletes selected');
      return;
    }
    if (tags.length === 0 && mode !== 'overwrite') {
      toast.error('Pick at least one sport / event');
      return;
    }
    setSaving(true);
    try {
      // Compute per-athlete next sports (preserve existing tags by default)
      const tagSet = tags.map((t) => t.trim()).filter(Boolean);
      const lower = (s: string) => s.trim().toLowerCase();

      const updates = athleteIds.map((id) => {
        const cur = currentSportsById[id] ?? [];
        let next: string[];
        if (mode === 'overwrite') {
          next = canonicalSports(tagSet);
        } else if (mode === 'remove') {
          const drop = new Set(tagSet.map(lower));
          next = cur.filter((s) => !drop.has(lower(s)));
        } else {
          // add (case-insensitive dedupe, preserve original casing)
          const seen = new Set(cur.map(lower));
          next = [...cur];
          for (const t of tagSet) {
            if (!seen.has(lower(t))) {
              next.push(t);
              seen.add(lower(t));
            }
          }
        }
        return { id, sports: next, sport_primary: next[0] ?? null };
      });

      // Batch — issue updates in parallel; RLS scopes per row
      const results = await Promise.all(
        updates.map((u) =>
          supabase
            .from('athletes')
            .update({ sports: u.sports, sport_primary: u.sport_primary })
            .eq('id', u.id),
        ),
      );
      const failed = results.filter((r) => r.error);
      if (failed.length) {
        console.error('Bulk sports failures:', failed.map((f) => f.error));
        toast.error(`${failed.length} of ${updates.length} updates failed`);
      } else {
        toast.success(`Updated ${updates.length} athlete(s)`);
        onApplied();
        reset();
        onOpenChange(false);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? 'Failed to apply bulk sports');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk assign sports</DialogTitle>
          <DialogDescription>
            Update {athleteIds.length} selected athlete{athleteIds.length === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid grid-cols-3 gap-2 mt-2">
              {(['add', 'remove', 'overwrite'] as Mode[]).map((m) => (
                <Label key={m} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={m} />
                  <span className="capitalize text-sm">{m}</span>
                </Label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'add' && 'Adds the chosen tags; existing sports are preserved.'}
              {mode === 'remove' && 'Removes the chosen tags from selected athletes.'}
              {mode === 'overwrite' && 'Replaces all existing sports with the chosen tags.'}
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sports / Events</Label>
            <div className="mt-2">
              <SportsSelector value={tags} onChange={setTags} options={options} />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quick bundles</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SPORT_BUNDLES.map((b) => (
                <Badge
                  key={b.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => applyBundle(b.sports)}
                >
                  + {b.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleApply} disabled={saving}>
            {saving ? 'Applying…' : `Apply to ${athleteIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
