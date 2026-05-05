import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Lock, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '../../dashboard/EmptyState';
import { ErrorState } from '../../dashboard/ErrorState';
import { useAssignments, useTeamAthletes } from './useAssignments';
import { AssignmentCreateDialog } from './AssignmentCreateDialog';
import { AssignmentDrawer } from './AssignmentDrawer';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { ASSIGNMENT_STATUSES, type AssignmentStatus } from './types';

const statusColor: Record<AssignmentStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  paused: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  completed: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  cancelled: 'bg-muted text-muted-foreground',
};

export const AssignmentsTab = () => {
  const [search, setSearch] = useState('');
  const [athleteId, setAthleteId] = useState('all');
  const [status, setStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: athletes = [] } = useTeamAthletes();
  const { data, isLoading, error, refetch } = useAssignments({ athleteId, status });

  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const guardWrite = useViewAsWriteGuard();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter(
      (r) =>
        r.athlete_name?.toLowerCase().includes(s) ||
        r.template_name?.toLowerCase().includes(s)
    );
  }, [data, search]);

  const handleNew = () => {
    if (guardWrite('Assigning programmes')) return;
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athlete or programme…"
              className="pl-8"
            />
          </div>
          <Select value={athleteId} onValueChange={setAthleteId}>
            <SelectTrigger className="md:w-[200px]">
              <SelectValue placeholder="Athlete" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All athletes</SelectItem>
              {athletes.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ASSIGNMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNew} disabled={!canEdit}>
            {canEdit ? <Plus className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
            Assign programme
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState variant="load-failed" onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description={
            canEdit
              ? 'Assign a published programme to your athletes to get started.'
              : 'Your tier does not allow programme assignments yet.'
          }
          primaryAction={
            canEdit ? { label: 'Assign programme', onClick: handleNew, icon: Plus } : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Assigned by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setActiveId(r.id)}
                  >
                    <TableCell className="font-medium">{r.athlete_name ?? '—'}</TableCell>
                    <TableCell>
                      {r.template_name ?? '—'}
                      {!r.template_published && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          unpublished
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{format(parseISO(r.start_date), 'PP')}</TableCell>
                    <TableCell>
                      {r.end_date ? format(parseISO(r.end_date), 'PP') : '—'}
                    </TableCell>
                    <TableCell>{format(parseISO(r.created_at), 'PP')}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.assigned_by_name ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AssignmentCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AssignmentDrawer
        assignmentId={activeId}
        open={!!activeId}
        onOpenChange={(o) => !o && setActiveId(null)}
      />
    </div>
  );
};
