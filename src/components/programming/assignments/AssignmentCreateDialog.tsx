import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  const handleSubmit = async () => {
    if (!templateId || athleteIds.length === 0) return;
    await createMut.mutateAsync({
      templateId,
      athleteIds,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
    });
    reset();
    onOpenChange(false);
  };

  const canSubmit = !!templateId && athleteIds.length > 0 && !createMut.isPending;

  return (
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
                  {athletes.map((a: any) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={athleteIds.includes(a.id)}
                        onCheckedChange={() => toggleAthlete(a.id)}
                      />
                      <span className="text-sm">{a.name}</span>
                      {a.email && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {a.email}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
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
  );
};
