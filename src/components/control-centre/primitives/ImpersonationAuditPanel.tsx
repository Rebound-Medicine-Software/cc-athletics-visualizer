import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Row {
  id: string;
  super_admin_id: string;
  team_id: string;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  super_admin_email?: string;
  super_admin_name?: string;
  team_name?: string;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const ImpersonationAuditPanel: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('super_admin_impersonation_logs')
      .select('id, super_admin_id, team_id, reason, started_at, ended_at')
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      toast.error(`Failed to load impersonation logs: ${error.message}`);
      setLoading(false);
      return;
    }

    const logs = (data ?? []) as Row[];
    const adminIds = [...new Set(logs.map((r) => r.super_admin_id))];
    const teamIds = [...new Set(logs.map((r) => r.team_id))];

    const [adminsRes, teamsRes] = await Promise.all([
      adminIds.length
        ? supabase.from('super_admin_users').select('auth_user_id, email, full_name').in('auth_user_id', adminIds)
        : Promise.resolve({ data: [] as any[] }),
      teamIds.length
        ? supabase.from('teams').select('id, name').in('id', teamIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const adminMap = new Map((adminsRes.data ?? []).map((a: any) => [a.auth_user_id, a]));
    const teamMap = new Map((teamsRes.data ?? []).map((t: any) => [t.id, t.name]));

    setRows(
      logs.map((r) => ({
        ...r,
        super_admin_email: adminMap.get(r.super_admin_id)?.email,
        super_admin_name: adminMap.get(r.super_admin_id)?.full_name,
        team_name: teamMap.get(r.team_id),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runCleanup = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('cleanup-stale-impersonations', {
      method: 'POST',
    });
    setRunning(false);
    if (error) {
      toast.error(`Cleanup failed: ${error.message}`);
      return;
    }
    toast.success(`Closed ${data?.closed ?? 0} stale session(s)`);
    load();
  };

  return (
    <div className="cc-glass p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="cc-h2">Super Admin Impersonation Log</h3>
          <p className="cc-subtle">Every "View-As" session, with reason and lifetime.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="cc-btn" onClick={load} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button className="cc-btn cc-btn-primary" onClick={runCleanup} disabled={running}>
            {running ? 'Cleaning…' : 'Close stale (>8h)'}
          </button>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={[
          {
            key: 'super_admin',
            label: 'Super Admin',
            render: (r: Row) => (
              <div className="flex flex-col">
                <span>{r.super_admin_name || r.super_admin_email || r.super_admin_id.slice(0, 8)}</span>
                {r.super_admin_email && r.super_admin_name && (
                  <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.super_admin_email}</code>
                )}
              </div>
            ),
          },
          {
            key: 'team',
            label: 'Organisation',
            render: (r: Row) => r.team_name || <code className="text-[11px]">{r.team_id.slice(0, 8)}</code>,
          },
          {
            key: 'reason',
            label: 'Reason',
            render: (r: Row) => (
              <span className="text-[12.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                {r.reason || '—'}
              </span>
            ),
          },
          { key: 'started_at', label: 'Started', render: (r: Row) => fmt(r.started_at) },
          { key: 'ended_at', label: 'Ended', render: (r: Row) => fmt(r.ended_at) },
          {
            key: 'status',
            label: 'Status',
            render: (r: Row) =>
              r.ended_at ? (
                <StatusBadge variant="muted">closed</StatusBadge>
              ) : (
                <StatusBadge variant="warning" dot>active</StatusBadge>
              ),
          },
        ]}
        maxHeight={520}
      />
    </div>
  );
};
