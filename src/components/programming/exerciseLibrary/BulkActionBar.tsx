import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Archive, ArchiveRestore, Trash2, X } from 'lucide-react';
import {
  useBulkArchiveExercises,
  useBulkDeleteExercises,
  useExerciseReferenceCounts,
} from './useExercises';
import type { Exercise } from './types';

interface Props {
  selected: Exercise[];
  onClear: () => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  totalVisible: number;
  disabled?: boolean;
}

export const BulkActionBar = ({
  selected,
  onClear,
  onSelectAll,
  onUnselectAll,
  totalVisible,
  disabled,
}: Props) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = useMemo(() => selected.map((e) => e.id), [selected]);
  const { data: refCounts } = useExerciseReferenceCounts(confirmDelete ? ids : []);

  const archiveMut = useBulkArchiveExercises();
  const deleteMut = useBulkDeleteExercises();

  if (selected.length === 0) return null;

  const allArchived = selected.every((e) => e.is_archived);
  const allActive = selected.every((e) => !e.is_archived);

  const deletableCount = refCounts
    ? ids.filter((id) => (refCounts[id] ?? 0) === 0).length
    : null;
  const blockedCount = refCounts ? ids.length - (deletableCount ?? 0) : null;

  return (
    <>
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-md border bg-background/95 p-3 shadow-sm backdrop-blur">
        <span className="text-sm font-medium">
          {selected.length} selected
        </span>
        <span className="text-xs text-muted-foreground">of {totalVisible}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={onSelectAll} disabled={disabled}>
            Select all
          </Button>
          <Button size="sm" variant="ghost" onClick={onUnselectAll} disabled={disabled}>
            Unselect all
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || allArchived || archiveMut.isPending}
            onClick={() =>
              archiveMut.mutate(
                { ids: selected.filter((e) => !e.is_archived).map((e) => e.id), archive: true },
                { onSuccess: () => onClear() },
              )
            }
          >
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            Archive
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || allActive || archiveMut.isPending}
            onClick={() =>
              archiveMut.mutate(
                { ids: selected.filter((e) => e.is_archived).map((e) => e.id), archive: false },
                { onSuccess: () => onClear() },
              )
            }
          >
            <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
            Unarchive
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={disabled || deleteMut.isPending}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected exercises?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>You selected <strong>{selected.length}</strong> exercise{selected.length === 1 ? '' : 's'}.</p>
                {refCounts ? (
                  <>
                    <p>
                      <strong>{deletableCount}</strong> can be permanently deleted.
                    </p>
                    {(blockedCount ?? 0) > 0 && (
                      <p className="text-amber-600 dark:text-amber-400">
                        <strong>{blockedCount}</strong> {blockedCount === 1 ? 'is' : 'are'} used in programmes and will be skipped. Archive instead to keep history intact.
                      </p>
                    )}
                    <p className="text-muted-foreground">This action cannot be undone.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Checking programme references…</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!refCounts || (deletableCount ?? 0) === 0 || deleteMut.isPending}
              onClick={async (e) => {
                e.preventDefault();
                await deleteMut.mutateAsync(ids).then(() => {
                  setConfirmDelete(false);
                  onClear();
                }).catch(() => {});
              }}
            >
              Delete {deletableCount ?? ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
