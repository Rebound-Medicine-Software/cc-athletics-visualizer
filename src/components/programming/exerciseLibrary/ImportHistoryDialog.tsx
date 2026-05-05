import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Loader2, Undo2, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId, useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ImportRecord {
  id: string;
  created_at: string;
  user_id: string | null;
  metadata: any;
  status: 'success' | 'partial' | 'failed';
  rolled_back_at?: string | null;
}

export const ImportHistoryDialog = ({ open, onOpenChange }: Props) => {
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const isViewAs = useIsViewAsMode();
  const guardWrite = useViewAsWriteGuard();
  const qc = useQueryClient();
  const writeBlocked = !canEdit || isViewAs;

  const [selected, setSelected] = useState<ImportRecord | null>(null);
  const [confirmRollback, setConfirmRollback] = useState<ImportRecord | null>(null);
  const [rolling, setRolling] = useState(false);

  const { data: imports, isLoading } = useQuery({
    queryKey: ['exercise-import-history', teamId],
    enabled: !!teamId && open,
    queryFn: async (): Promise<ImportRecord[]> => {
      const { data, error } = await supabase
        .from('platform_activity_logs')
        .select('id, created_at, user_id, metadata, event_type')
        .eq('team_id', teamId!)
        .in('event_type', ['exercise_import_completed', 'exercise_import_failed'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      // Find rollback events to mark
      const importIds = (data ?? [])
        .map((d: any) => d.metadata?.import_id)
        .filter(Boolean);
      let rolledBack: Record<string, string> = {};
      if (importIds.length) {
        const { data: rb } = await supabase
          .from('platform_activity_logs')
          .select('created_at, metadata')
          .eq('team_id', teamId!)
          .eq('event_type', 'exercise_import_rollback_completed');
        (rb ?? []).forEach((r: any) => {
          const id = r.metadata?.import_id;
          if (id) rolledBack[id] = r.created_at;
        });
      }
      return (data ?? []).map((d: any) => ({
        id: d.id,
        created_at: d.created_at,
        user_id: d.user_id,
        metadata: d.metadata ?? {},
        status:
          d.event_type === 'exercise_import_failed'
            ? 'failed'
            : (d.metadata?.status as any) ?? 'success',
        rolled_back_at: d.metadata?.import_id ? rolledBack[d.metadata.import_id] ?? null : null,
      }));
    },
  });

  // Fetch affected exercise current state for detail view
  const affectedIds = useMemo(() => {
    if (!selected) return [] as string[];
    return (selected.metadata.affected_exercise_ids ?? []) as string[];
  }, [selected]);

  const { data: affectedRows } = useQuery({
    queryKey: ['exercise-import-affected', teamId, affectedIds.sort().join(',')],
    enabled: !!teamId && affectedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, video_url, primary_muscles, equipment, instructions, category, is_archived')
        .in('id', affectedIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rollbackMut = useMutation({
    mutationFn: async (rec: ImportRecord) => {
      if (!teamId) throw new Error('No team context');
      const importId = rec.metadata.import_id;
      const created_ids: string[] = rec.metadata.created_ids ?? [];
      const updated_snapshots: Array<{ id: string; previous: any }> =
        rec.metadata.updated_snapshots ?? [];

      await supabase.from('platform_activity_logs').insert({
        event_type: 'exercise_import_rollback_started',
        event_source: 'programming.exercise_library.bulk_import',
        team_id: teamId,
        user_id: user?.id ?? null,
        severity: 'warning',
        metadata: { import_id: importId, source_log_id: rec.id },
      });

      let deleted = 0;
      let reverted = 0;
      let blocked = 0;
      const blockedIds: string[] = [];

      // Reverts
      for (const snap of updated_snapshots) {
        const { error } = await supabase
          .from('exercises')
          .update({
            name: snap.previous.name,
            video_url: snap.previous.video_url,
            primary_muscles: snap.previous.primary_muscles ?? [],
            equipment: snap.previous.equipment ?? [],
            instructions: snap.previous.instructions,
            category: snap.previous.category,
            updated_by: user?.id ?? null,
          })
          .eq('id', snap.id)
          .eq('team_id', teamId);
        if (!error) reverted++;
      }

      // Deletes — only if unreferenced
      if (created_ids.length) {
        const { data: refs } = await supabase
          .from('programming_exercises')
          .select('exercise_id')
          .in('exercise_id', created_ids);
        const refSet = new Set((refs ?? []).map((r: any) => r.exercise_id));
        const deletable = created_ids.filter((id) => !refSet.has(id));
        const blockedList = created_ids.filter((id) => refSet.has(id));
        blocked = blockedList.length;
        blockedIds.push(...blockedList);
        if (deletable.length) {
          const { error } = await supabase
            .from('exercises')
            .delete()
            .in('id', deletable)
            .eq('team_id', teamId);
          if (!error) deleted = deletable.length;
        }
      }

      await supabase.from('platform_activity_logs').insert({
        event_type: 'exercise_import_rollback_completed',
        event_source: 'programming.exercise_library.bulk_import',
        team_id: teamId,
        user_id: user?.id ?? null,
        severity: 'info',
        metadata: {
          import_id: importId,
          source_log_id: rec.id,
          deleted,
          reverted,
          blocked,
          blocked_ids: blockedIds,
        },
      });

      return { deleted, reverted, blocked };
    },
    onSuccess: ({ deleted, reverted, blocked }) => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-facets'] });
      qc.invalidateQueries({ queryKey: ['exercise-import-history'] });
      toast.success(
        `Rollback complete — ${deleted} deleted, ${reverted} reverted${blocked ? `, ${blocked} blocked (in use)` : ''}`,
      );
      setConfirmRollback(null);
      setSelected(null);
    },
    onError: async (e: any) => {
      try {
        await supabase.from('platform_activity_logs').insert({
          event_type: 'exercise_import_rollback_failed',
          event_source: 'programming.exercise_library.bulk_import',
          team_id: teamId,
          user_id: user?.id ?? null,
          severity: 'critical',
          metadata: { error: e?.message },
        });
      } catch {/* ignore */}
      toast.error(e?.message ?? 'Rollback failed');
    },
  });

  // Pre-rollback ref check for confirm dialog
  const { data: rollbackPreview } = useQuery({
    queryKey: ['rollback-preview', confirmRollback?.id],
    enabled: !!confirmRollback,
    queryFn: async () => {
      const m = confirmRollback!.metadata;
      const created_ids: string[] = m.created_ids ?? [];
      const updated: any[] = m.updated_snapshots ?? [];
      let blocked = 0;
      if (created_ids.length) {
        const { data: refs } = await supabase
          .from('programming_exercises')
          .select('exercise_id')
          .in('exercise_id', created_ids);
        blocked = new Set((refs ?? []).map((r: any) => r.exercise_id)).size;
      }
      return {
        toDelete: Math.max(0, created_ids.length - blocked),
        toRevert: updated.length,
        blocked,
      };
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(null); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selected && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <History className="h-4 w-4" />
            {selected ? 'Import detail' : 'Import history'}
          </DialogTitle>
          <DialogDescription>
            {selected
              ? 'Details of this bulk import. You can roll back to undo affected changes.'
              : 'Recent bulk imports for this team. Click a row for details and rollback options.'}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="flex-1 min-h-0 overflow-auto">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !imports || imports.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 text-center">
                No bulk imports yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                  <tr className="text-xs uppercase tracking-wide text-left">
                    <th className="p-2">When</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Updated</th>
                    <th className="p-2">Skipped</th>
                    <th className="p-2">Invalid</th>
                    <th className="p-2">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((rec) => {
                    const m = rec.metadata ?? {};
                    return (
                      <tr key={rec.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(rec)}>
                        <td className="p-2 whitespace-nowrap">{new Date(rec.created_at).toLocaleString()}</td>
                        <td className="p-2">{m.mode ?? '—'}</td>
                        <td className="p-2">{m.created ?? 0}</td>
                        <td className="p-2">{m.updated ?? 0}</td>
                        <td className="p-2">{m.skipped ?? 0}</td>
                        <td className="p-2">{m.invalid ?? 0}</td>
                        <td className="p-2">
                          {rec.rolled_back_at ? (
                            <Badge variant="outline">Rolled back</Badge>
                          ) : rec.status === 'success' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Success</Badge>
                          ) : rec.status === 'partial' ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Partial</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <Button size="sm" variant="ghost">View</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Mode: {selected.metadata.mode ?? '—'}</Badge>
              <Badge>Created {selected.metadata.created ?? 0}</Badge>
              <Badge>Updated {selected.metadata.updated ?? 0}</Badge>
              <Badge>Skipped {selected.metadata.skipped ?? 0}</Badge>
              <Badge>Invalid {selected.metadata.invalid ?? 0}</Badge>
              {selected.rolled_back_at && <Badge variant="outline">Rolled back {new Date(selected.rolled_back_at).toLocaleString()}</Badge>}
            </div>

            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-xs uppercase tracking-wide text-left">
                    <th className="p-2">Action</th>
                    <th className="p-2">Current name</th>
                    <th className="p-2">Previous name</th>
                    <th className="p-2">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.metadata.created_ids ?? []).map((id: string) => {
                    const cur = affectedRows?.find((r: any) => r.id === id);
                    return (
                      <tr key={`c-${id}`} className="border-t">
                        <td className="p-2"><Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Created</Badge></td>
                        <td className="p-2">{cur?.name ?? <span className="text-muted-foreground">(deleted)</span>}</td>
                        <td className="p-2 text-muted-foreground">—</td>
                        <td className="p-2 text-muted-foreground">New row</td>
                      </tr>
                    );
                  })}
                  {(selected.metadata.updated_snapshots ?? []).map((snap: any) => {
                    const cur = affectedRows?.find((r: any) => r.id === snap.id);
                    const diffs: string[] = [];
                    if (cur && snap.previous) {
                      if (cur.name !== snap.previous.name) diffs.push('name');
                      if ((cur.video_url ?? '') !== (snap.previous.video_url ?? '')) diffs.push('video_url');
                      if (JSON.stringify(cur.primary_muscles ?? []) !== JSON.stringify(snap.previous.primary_muscles ?? [])) diffs.push('primary_muscles');
                      if (JSON.stringify(cur.equipment ?? []) !== JSON.stringify(snap.previous.equipment ?? [])) diffs.push('equipment');
                      if ((cur.instructions ?? '') !== (snap.previous.instructions ?? '')) diffs.push('instructions');
                    }
                    return (
                      <tr key={`u-${snap.id}`} className="border-t">
                        <td className="p-2"><Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400">Updated</Badge></td>
                        <td className="p-2">{cur?.name ?? '—'}</td>
                        <td className="p-2 text-muted-foreground">{snap.previous?.name ?? '—'}</td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {diffs.length ? diffs.join(', ') : 'no detected diff'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="destructive"
                onClick={() => {
                  if (writeBlocked) { toast.warning('Editing disabled in current mode.'); return; }
                  if (guardWrite('Rolling back imports')) return;
                  if (!selected.metadata.import_id) {
                    toast.error('This import has no rollback snapshot (legacy log).');
                    return;
                  }
                  setConfirmRollback(selected);
                }}
                disabled={writeBlocked || !!selected.rolled_back_at}
              >
                <Undo2 className="h-4 w-4 mr-1.5" />
                {selected.rolled_back_at ? 'Already rolled back' : 'Rollback this import'}
              </Button>
            </div>
          </div>
        )}

        <AlertDialog open={!!confirmRollback} onOpenChange={(o) => !o && setConfirmRollback(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rollback import?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <div>This will attempt to undo the changes made by this import:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>{rollbackPreview?.toDelete ?? '…'}</strong> created exercises will be deleted</li>
                    <li><strong>{rollbackPreview?.toRevert ?? '…'}</strong> updated exercises will be reverted to previous values</li>
                    <li><strong>{rollbackPreview?.blocked ?? '…'}</strong> are now in use in programmes and cannot be removed</li>
                  </ul>
                  <div className="text-xs text-muted-foreground">This cannot be undone.</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={rolling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  if (!confirmRollback) return;
                  setRolling(true);
                  try { await rollbackMut.mutateAsync(confirmRollback); } finally { setRolling(false); }
                }}
                disabled={rolling}
              >
                {rolling ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Confirm rollback
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
