import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useExercises } from '../exerciseLibrary/useExercises';
import type { Exercise } from '../exerciseLibrary/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (exercise: Exercise) => void;
}

export const ExercisePickerDialog = ({ open, onOpenChange, onPick }: Props) => {
  const [search, setSearch] = useState('');
  const filters = useMemo(
    () => ({ search, category: 'all', equipment: 'all', showArchived: false }),
    [search],
  );
  const { data, isLoading } = useExercises(filters);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>Pick from your team library.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No exercises found.</p>
          ) : (
            data.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onPick(ex);
                  onOpenChange(false);
                }}
                className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{ex.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[ex.category, (ex.primary_muscles ?? []).join(', ')].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
