import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Link2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useTeamAthletes,
  usePublishedTemplates,
  useCreateAssignments,
} from './useAssignments';
import { groupDuplicates } from '@/lib/athletes/duplicateDetection';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const AssignmentCreateDialog = ({ open, onOpenChange }: Props) => {
  const { data: athletes = [], isLoading: aLoading } = useTeamAthletes();
  const { data: templates = [], isLoading: tLoading } = usePublishedTemplates();
  const createMut = useCreateAssignments();

  const [templateId, setTemplateId] = useState<string>('');
  const [athleteIds, setAthleteIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const groups = useMemo(() => groupDuplicates(athletes as any[]), [athletes]);

  const selectedAthletes = useMemo(
    () => (athletes as any[]).filter((a) => athleteIds.includes(a.id)),
    [athletes, athleteIds]
  );

  /** Selected rows that are NOT the canonical row of their duplicate group. */
  const nonCanonicalSelected = useMemo(
    () =>
      selectedAthletes.filter((a) => {
        const g = groups.get(a.duplicateKey);
        return g && g.hasDuplicates && g.canonical.id !== a.id;
      }),
    [selectedAthletes, groups]
  );

  const reset = () => {
    setTemplateId('');
    setAthleteIds([]);
    setStartDate(new Date());
    setEndDate(undefined);
  };

  const toggleAthlete = (id: string) => {
    setAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const doAssign = async () => {
    await createMut.mutateAsync({
      templateId,
      athleteIds,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
    });
    reset();
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!templateId || athleteIds.length === 0) return;
    if (nonCanonicalSelected.length > 0) {
      setConfirmOpen(true);
      return;
    }
    await doAssign();
  };

  /** Swap any non-canonical selections for their canonical sibling. */
  const useCanonicalInstead = () => {
    const next = new Set<string>();
    for (const a of selectedAthletes) {
      const g = groups.get(a.duplicateKey);
      next.add(g ? g.canonical.id : a.id);
    }
    setAthleteIds(Array.from(next));
    setConfirmOpen(false);
  };

  const canSubmit = !!templateId && athleteIds.length > 0 && !createMut.isPending;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) reset();
          onOpenChange(o);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign programme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={tLoading ? 'Loading…' : 'Select a published template'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No published templates yet.
                    </div>
                  )}
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.duration_weeks ? `· ${t.duration_weeks}w` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'No end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                    {endDate && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setEndDate(undefined)}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Athletes ({athleteIds.length} selected)</Label>
              <div className="rounded-md border">
                <ScrollArea className="h-56">
                  <div className="p-2 space-y-1">
                    {aLoading && (
                      <div className="text-sm text-muted-foreground p-2">Loading…</div>
                    )}
                    {!aLoading && athletes.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">
                        No athletes in this team.
                      </div>
                    )}
                    {(athletes as any[]).map((a: any) => {
                      const isDup = a.duplicateCount > 1;
                      const isCanonical = a.isCanonical;
                      return (
                        <label
                          key={a.id}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer',
                            isDup && !isCanonical && 'bg-amber-50/60 dark:bg-amber-950/20'
                          )}
                        >
                          <Checkbox
                            checked={athleteIds.includes(a.id)}
                            onCheckedChange={() => toggleAthlete(a.id)}
                          />
                          <span className="text-sm">{a.name}</span>
                          {a.isLinked ? (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                              <Link2 className="w-3 h-3" /> Linked
                            </Badge>
                          ) : null}
                          {isDup && isCanonical && (
                            <Badge className="h-5 px-1.5 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-600">
                              <ShieldCheck className="w-3 h-3" /> Canonical
                            </Badge>
                          )}
                          {isDup && !isCanonical && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-amber-500 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </Badge>
                          )}
                          {a.email && (
                            <span className="text-xs text-muted-foreground ml-auto truncate max-w-[40%]">
                              {a.email}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              {nonCanonicalSelected.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 p-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-medium text-amber-800 dark:text-amber-300">
                      {nonCanonicalSelected.length} selected athlete
                      {nonCanonicalSelected.length === 1 ? ' looks' : 's look'} like a duplicate.
                    </div>
                    <div className="text-amber-700/80 dark:text-amber-300/80">
                      Programs should be assigned to the canonical record (linked account, most activity).
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-amber-700 dark:text-amber-300"
                      onClick={useCanonicalInstead}
                    >
                      Use canonical record instead
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {createMut.isPending ? 'Assigning…' : `Assign to ${athleteIds.length || 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Possible duplicate athlete
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  You're about to assign to {nonCanonicalSelected.length} athlete record
                  {nonCanonicalSelected.length === 1 ? '' : 's'} that look like duplicates.
                  These may not be the record linked to the athlete's app account.
                </p>
                <ul className="space-y-1 rounded border bg-muted/40 p-2">
                  {nonCanonicalSelected.map((a: any) => {
                    const g = groups.get(a.duplicateKey)!;
                    return (
                      <li key={a.id} className="text-xs">
                        <span className="font-medium">{a.name}</span>{' '}
                        <span className="text-muted-foreground">
                          → canonical: {g.canonical.name}
                          {g.canonical.email ? ` (${g.canonical.email})` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-muted-foreground">Continue anyway, or switch to the canonical records?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={useCanonicalInstead}>
              Use canonical instead
            </Button>
            <AlertDialogAction onClick={doAssign}>Assign anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
