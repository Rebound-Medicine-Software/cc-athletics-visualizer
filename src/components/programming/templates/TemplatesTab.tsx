import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Lock, ChevronRight, ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ErrorState } from '@/components/dashboard/ErrorState';
import { TemplateFormDialog } from './TemplateFormDialog';
import { TemplateBuilder } from './TemplateBuilder';
import { useTemplates, useCreateTemplate } from './useTemplates';
import { TEMPLATE_GOALS } from './types';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { toast } from 'sonner';

export const TemplatesTab = () => {
  const [search, setSearch] = useState('');
  const [goal, setGoal] = useState('all');
  const [status, setStatus] = useState('active');
  const [formOpen, setFormOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const isViewAs = useIsViewAsMode();
  const guardWrite = useViewAsWriteGuard();
  const writeBlocked = !canEdit || isViewAs;

  const filters = useMemo(() => ({ search, goal, status }), [search, goal, status]);
  const { data, isLoading, error, refetch } = useTemplates(filters);
  const createMut = useCreateTemplate();

  const handleNew = () => {
    if (!canEdit) {
      toast.warning('Your tier does not allow editing programming.');
      return;
    }
    if (guardWrite('Creating templates')) return;
    setFormOpen(true);
  };

  if (activeId) {
    return <TemplateBuilder templateId={activeId} onBack={() => setActiveId(null)} />;
  }

  if (error) {
    return (
      <ErrorState
        variant="load-failed"
        description="We couldn't load your templates. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-44">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All goals</SelectItem>
                  {TEMPLATE_GOALS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleNew} disabled={writeBlocked}>
            {writeBlocked ? <Lock className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            New template
          </Button>
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

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            search || goal !== 'all' || status !== 'active'
              ? 'No templates match your filters'
              : 'No templates yet'
          }
          description={
            search || goal !== 'all' || status !== 'active'
              ? 'Try clearing filters or broadening your search.'
              : 'Build your first programme template to assign to athletes later.'
          }
          primaryAction={writeBlocked ? undefined : { label: 'New template', onClick: handleNew, icon: Plus }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-colors hover:bg-accent ${t.archived_at ? 'opacity-70' : ''}`}
              onClick={() => setActiveId(t.id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold truncate">{t.name}</h4>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.is_published ? (
                    <Badge className="text-[10px]">Published</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Draft
                    </Badge>
                  )}
                  {t.goal && (
                    <Badge variant="outline" className="text-[10px]">
                      {t.goal}
                    </Badge>
                  )}
                  {t.duration_weeks && (
                    <Badge variant="outline" className="text-[10px]">
                      {t.duration_weeks} wk
                    </Badge>
                  )}
                  {t.archived_at && (
                    <Badge variant="outline" className="text-[10px]">
                      Archived
                    </Badge>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMut.isPending}
        onSubmit={async (values) => {
          const created = await createMut.mutateAsync(values);
          setFormOpen(false);
          setActiveId(created.id);
        }}
      />
    </div>
  );
};
