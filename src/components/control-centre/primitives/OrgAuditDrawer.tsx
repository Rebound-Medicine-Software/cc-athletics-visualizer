import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { StatusBadge } from './StatusBadge';
import { History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  teamId: string | null;
  organisationName: string | null;
  onClose: () => void;
}

interface AuditRow {
  id: string;
  event_type: string;
  event_source: string | null;
  severity: string;
  user_id: string | null;
  user_label: string | null;
  metadata: any;
  created_at: string;
}

const sevVariant = (s: string) =>
  s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info';

const fmt = (iso: string) => new Date(iso).toLocaleString();

export const OrgAuditDrawer: React.FC<Props> = ({ teamId, organisationName, onClose }) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (tid: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_organisation_audit_events', {
      team_uuid: tid,
      row_limit: 100,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data as unknown as AuditRow[]) || []);
  };

  useEffect(() => {
    if (teamId) load(teamId);
    else setRows([]);
  }, [teamId]);

  return (
    <Sheet open={!!teamId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Audit Trail — {organisationName || 'Organisation'}
          </SheetTitle>
          <SheetDescription>
            Recent platform activity events recorded for this organisation.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between mt-4 mb-3">
          <span className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
            {loading ? 'Loading…' : `${rows.length} event${rows.length === 1 ? '' : 's'}`}
          </span>
          <button className="cc-btn" onClick={() => teamId && load(teamId)} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="space-y-2">
          {!loading && rows.length === 0 && (
            <p className="cc-subtle text-sm py-4 text-center">No audit events for this organisation yet.</p>
          )}
          {rows.map((r) => (
            <div key={r.id} className="p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.event_type}</code>
                <StatusBadge variant={sevVariant(r.severity) as any} dot>{r.severity}</StatusBadge>
              </div>
              <div className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                {fmt(r.created_at)} · {r.user_label || 'system'}{r.event_source ? ` · ${r.event_source}` : ''}
              </div>
              {r.metadata && Object.keys(r.metadata).length > 0 && (
                <pre className="text-[11px] mt-2 p-2 rounded overflow-auto"
                  style={{ background: 'hsl(var(--cc-surface-2))', color: 'hsl(var(--cc-fg-muted))', maxHeight: 160 }}
                >
{JSON.stringify(r.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
