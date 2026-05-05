import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Search, Plus, Pencil, Archive, ArchiveRestore, Dumbbell, ExternalLink, Lock, Upload } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '../../dashboard/EmptyState';
import { ErrorState } from '../../dashboard/ErrorState';
import { ExerciseFormDialog } from './ExerciseFormDialog';
import { BulkUploadDialog } from './BulkUploadDialog';
import { BulkActionBar } from './BulkActionBar';
import { VideoPreviewButton } from '../shared/VideoPreviewButton';
import {
  useExercises,
  useExerciseFacets,
  useCreateExercise,
  useUpdateExercise,
  useToggleArchiveExercise,
} from './useExercises';
import { EXERCISE_CATEGORIES, type Exercise } from './types';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { toast } from 'sonner';

export const ExerciseLibrary = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Exercise | null>(null);

  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const isViewAs = useIsViewAsMode();
  const guardWrite = useViewAsWriteGuard();

  const filters = useMemo(
    () => ({ search, category, equipment, showArchived }),
    [search, category, equipment, showArchived],
  );
  const { data: exercises, isLoading, error, refetch } = useExercises(filters);
  const { data: facets } = useExerciseFacets();

  const createMut = useCreateExercise();
  const updateMut = useUpdateExercise();
  const archiveMut = useToggleArchiveExercise();

  const handleNew = () => {
    if (!canEdit) {
      toast.warning('Your tier does not allow editing programming.');
      return;
    }
    if (guardWrite('Creating exercises')) return;
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (ex: Exercise) => {
    if (!canEdit) {
      toast.warning('Your tier does not allow editing programming.');
      return;
    }
    if (guardWrite('Editing exercises')) return;
    setEditing(ex);
    setFormOpen(true);
  };

  const handleArchive = (ex: Exercise) => {
    if (!canEdit) {
      toast.warning('Your tier does not allow editing programming.');
      return;
    }
    if (guardWrite('Archiving exercises')) return;
    setConfirmArchive(ex);
  };

  const writeBlocked = !canEdit || isViewAs;

  if (error) {
    return (
      <ErrorState
        variant="load-failed"
        description="We couldn't load your exercise library. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="ex-search" className="text-xs uppercase tracking-wider text-muted-foreground">
                Search
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="ex-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-44">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {EXERCISE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-44">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Equipment</Label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All equipment</SelectItem>
                  {(facets?.equipment ?? []).map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="archived" className="text-sm cursor-pointer">
                Show archived
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!canEdit) { toast.warning('Your tier does not allow editing programming.'); return; }
                if (guardWrite('Bulk importing exercises')) return;
                setBulkOpen(true);
              }}
              disabled={writeBlocked}
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk upload
            </Button>
            <Button onClick={handleNew} disabled={writeBlocked}>
              {writeBlocked ? <Lock className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              New exercise
            </Button>
          </div>
        </CardContent>
      </Card>

      {!canEdit && (
        <p className="text-xs text-muted-foreground px-1">
          Read-only: your tier does not include programming editing.
        </p>
      )}
      {isViewAs && canEdit && (
        <p className="text-xs text-muted-foreground px-1">
          View-As mode: writes are disabled. End impersonation to edit.
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={search || category !== 'all' || equipment !== 'all' ? 'No exercises match your filters' : 'No exercises yet'}
          description={
            search || category !== 'all' || equipment !== 'all'
              ? 'Try clearing filters or broadening your search.'
              : 'Build your team library so you can drop exercises into programmes in seconds.'
          }
          primaryAction={
            !canEdit || isViewAs
              ? undefined
              : { label: 'New exercise', onClick: handleNew, icon: Plus }
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <Card key={ex.id} className={ex.is_archived ? 'opacity-70' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{ex.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {ex.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ex.category}
                        </Badge>
                      )}
                      {ex.is_archived && (
                        <Badge variant="outline" className="text-[10px]">
                          Archived
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {ex.primary_muscles?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Muscles:</span>{' '}
                    {ex.primary_muscles.join(', ')}
                  </div>
                )}
                {ex.equipment?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Equipment:</span>{' '}
                    {ex.equipment.join(', ')}
                  </div>
                )}
                {ex.instructions && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{ex.instructions}</p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  {ex.video_url ? (
                    <VideoPreviewButton url={ex.video_url} />
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleEdit(ex)}
                      disabled={writeBlocked}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleArchive(ex)}
                      disabled={writeBlocked}
                    >
                      {ex.is_archived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExerciseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        exercise={editing}
        submitting={createMut.isPending || updateMut.isPending}
        onSubmit={async (values) => {
          if (editing) {
            await updateMut.mutateAsync({ id: editing.id, values });
          } else {
            await createMut.mutateAsync(values);
          }
          setFormOpen(false);
        }}
      />

      <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      <AlertDialog open={!!confirmArchive} onOpenChange={(o) => !o && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmArchive?.is_archived ? 'Restore exercise?' : 'Archive exercise?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmArchive?.is_archived
                ? `"${confirmArchive?.name}" will be visible in the library again.`
                : `"${confirmArchive?.name}" will be hidden from the active library. Existing programmes are not affected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmArchive) {
                  await archiveMut.mutateAsync(confirmArchive);
                  setConfirmArchive(null);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
