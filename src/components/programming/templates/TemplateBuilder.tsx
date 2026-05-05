import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Pencil, Globe, EyeOff, Archive, ArchiveRestore, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ErrorState } from '@/components/dashboard/ErrorState';
import { TemplateFormDialog } from './TemplateFormDialog';
import { BlockCard } from './BlockCard';
import {
  useTemplate,
  useUpdateTemplate,
  useArchiveTemplate,
  useTogglePublishTemplate,
  useBlocks,
  useCreateBlock,
  useReorderBlocks,
} from './useTemplates';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { toast } from 'sonner';

interface Props {
  templateId: string;
  onBack: () => void;
}

export const TemplateBuilder = ({ templateId, onBack }: Props) => {
  const { data: template, isLoading, error, refetch } = useTemplate(templateId);
  const { data: blocks, isLoading: blocksLoading } = useBlocks(templateId);
  const updateMut = useUpdateTemplate();
  const archiveMut = useArchiveTemplate();
  const publishMut = useTogglePublishTemplate();
  const createBlockMut = useCreateBlock();
  const reorderBlocksMut = useReorderBlocks();

  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const isViewAs = useIsViewAsMode();
  const guardWrite = useViewAsWriteGuard();
  const writeBlocked = !canEdit || isViewAs;

  const [editOpen, setEditOpen] = useState(false);

  const guard = (label: string) => {
    if (!canEdit) {
      toast.warning('Your tier does not allow editing programming.');
      return true;
    }
    return guardWrite(label);
  };

  if (error) {
    return <ErrorState variant="load-failed" description="Failed to load template." onRetry={() => refetch()} />;
  }

  if (isLoading || !template) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const archived = !!template.archived_at;

  const handleAddBlock = () => {
    if (guard('Adding blocks')) return;
    createBlockMut.mutate({ templateId, position: blocks?.length ?? 0 });
  };

  const handleMoveBlock = (i: number, dir: -1 | 1) => {
    if (!blocks) return;
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    reorderBlocksMut.mutate({ templateId, ordered: next });
  };

  const handleFinish = async () => {
    if (guard('Finishing programme')) return;
    if (!template.name?.trim()) {
      toast.error('Programme needs a name before finishing.');
      return;
    }
    if (!blocks || blocks.length === 0) {
      toast.error('Add at least one block before finishing.');
      return;
    }
    const blockIds = blocks.map((b) => b.id);
    const { count, error } = await supabase
      .from('programming_exercises')
      .select('id', { count: 'exact', head: true })
      .in('block_id', blockIds);
    if (error) {
      toast.error(error.message ?? 'Failed to validate programme.');
      return;
    }
    if (!count || count === 0) {
      toast.error('Add at least one prescribed exercise before finishing.');
      return;
    }
    if (!template.is_published) {
      publishMut.mutate(template);
    }
    toast.success('Programme ready to assign.');
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> All templates
      </Button>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold truncate">{template.name}</h2>
              {template.is_published ? (
                <Badge>Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              {archived && <Badge variant="outline">Archived</Badge>}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              {template.goal && <span>Goal: {template.goal}</span>}
              {template.duration_weeks && <span>{template.duration_weeks} wk</span>}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{template.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={writeBlocked}
              onClick={() => {
                if (guard('Editing template')) return;
                setEditOpen(true);
              }}
            >
              {writeBlocked ? <Lock className="h-3.5 w-3.5 mr-1" /> : <Pencil className="h-3.5 w-3.5 mr-1" />}
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={writeBlocked || archived}
              onClick={() => {
                if (guard('Publishing template')) return;
                publishMut.mutate(template);
              }}
            >
              {template.is_published ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 mr-1" /> Publish
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={writeBlocked}
              onClick={() => {
                if (guard('Archiving template')) return;
                archiveMut.mutate(template);
              }}
            >
              {archived ? (
                <>
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                </>
              )}
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

      {/* Blocks */}
      <div className="space-y-3">
        {blocksLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !blocks || blocks.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No blocks yet"
            description="Blocks group exercises into phases or weeks of the programme."
            primaryAction={writeBlocked ? undefined : { label: 'Add first block', onClick: handleAddBlock, icon: Plus }}
          />
        ) : (
          blocks.map((b, i) => (
            <BlockCard
              key={b.id}
              block={b}
              index={i}
              total={blocks.length}
              disabled={writeBlocked}
              onMove={(dir) => handleMoveBlock(i, dir)}
            />
          ))
        )}

        {blocks && blocks.length > 0 && (
          <Button variant="outline" disabled={writeBlocked} onClick={handleAddBlock}>
            <Plus className="h-4 w-4 mr-1" /> Add block
          </Button>
        )}
      </div>

      <TemplateFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        template={template}
        submitting={updateMut.isPending}
        onSubmit={async (values) => {
          await updateMut.mutateAsync({ id: template.id, values });
          setEditOpen(false);
        }}
      />
    </div>
  );
};
