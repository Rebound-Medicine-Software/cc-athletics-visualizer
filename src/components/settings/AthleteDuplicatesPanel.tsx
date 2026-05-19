import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Archive, Link2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  annotateAthletes,
  groupDuplicates,
  type AthleteLike,
} from '@/lib/athletes/duplicateDetection';

interface Row extends AthleteLike {
  assignment_count: number;
}

export const AthleteDuplicatesPanel = () => {
  const { teamId } = useEffectiveTeamId();
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['athlete-duplicates', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, email, user_id, activity_status, team_id, last_test_at, updated_at, created_at')
        .eq('team_id', teamId!);
      if (error) throw error;
      const list = data ?? [];
      let counts: Record<string, number> = {};
      if (list.length) {
        const { data: a } = await supabase
          .from('athlete_program_assignments')
          .select('athlete_id')
          .eq('team_id', teamId!)
          .in('athlete_id', list.map((r: any) => r.id));
        for (const x of a ?? []) counts[x.athlete_id] = (counts[x.athlete_id] ?? 0) + 1;
      }
      return list.map((r: any) => ({ ...r, assignment_count: counts[r.id] ?? 0 }));
    },
  });

  const annotated = useMemo(() => annotateAthletes(rows), [rows]);
  const groups = useMemo(() => groupDuplicates(rows), [rows]);
  const dupGroups = useMemo(
    () => Array.from(groups.values()).filter((g) => g.hasDuplicates),
    [groups]
  );

  const archiveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('athletes')
        .update({ activity_status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Archived duplicate');
      qc.invalidateQueries({ queryKey: ['athlete-duplicates'] });
      qc.invalidateQueries({ queryKey: ['team-athletes-for-assignments'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to archive'),
  });

  const visible = showAll ? annotated : annotated.filter((a) => a.duplicateCount > 1);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Athlete duplicate diagnostics
          </h3>
          <p className="text-sm text-muted-foreground">
            {dupGroups.length} possible duplicate group{dupGroups.length === 1 ? '' : 's'} found.
            The canonical record is the one linked to an athlete account with the most activity —
            assign programs to that one.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Only duplicates' : 'Show all athletes'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-4">Scanning…</div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 border rounded-md">
          No duplicate athletes detected. 🎉
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Athlete</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Programs</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible
                .sort((a, b) => (a.duplicateKey > b.duplicateKey ? 1 : -1))
                .map((a) => (
                  <TableRow
                    key={a.id}
                    className={a.duplicateCount > 1 && !a.isCanonical ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.name}</span>
                        {a.duplicateCount > 1 && a.isCanonical && (
                          <Badge className="h-5 px-1.5 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-600">
                            <ShieldCheck className="w-3 h-3" /> Canonical
                          </Badge>
                        )}
                        {a.duplicateCount > 1 && !a.isCanonical && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-amber-500 text-amber-700 dark:text-amber-400">
                            Duplicate
                          </Badge>
                        )}
                        {a.isArchived && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            Archived
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.user_id ? (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                          <Link2 className="w-3 h-3" /> Yes
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{a.email ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{(a as Row).assignment_count}</TableCell>
                    <TableCell className="text-xs">
                      {a.last_test_at ? new Date(a.last_test_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{a.activity_status ?? 'active'}</TableCell>
                    <TableCell className="text-right">
                      {!a.isCanonical && !a.isArchived && a.duplicateCount > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Archive duplicate "${a.name}"? Programs already attached will remain accessible but it won't appear in pickers.`)) {
                              archiveMut.mutate(a.id);
                            }
                          }}
                          disabled={archiveMut.isPending}
                        >
                          <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Detection signals: shared email (case-insensitive) or normalised full name within the same team.
        Canonical is chosen by: linked account → has email → active → recent activity → assignment count.
      </p>
    </div>
  );
};
