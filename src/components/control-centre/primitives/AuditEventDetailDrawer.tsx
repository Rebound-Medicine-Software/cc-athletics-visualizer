import React, { useEffect, useState } from 'react';
import { X, Activity, AlertTriangle, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';

interface Props {
  eventId: string | null;
  onClose: () => void;
}

interface RelatedAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string | null;
  description: string | null;
  created_at: string;
}

interface Detail {
  event_id: string;
  source: string;
  event_type: string;
  severity: string;
  actor_id: string | null;
  actor_label: string | null;
  actor_full_name?: string | null;
  team_id: string | null;
  organisation_name: string | null;
  occurred_at: string;
  metadata: any;
  related_alerts: RelatedAlert[];
  event_source?: string | null;
  athlete_id?: string | null;
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');
const sevVariant = (s: string) =>
  s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info';

export const AuditEventDetailDrawer: React.FC<Props> = ({ eventId, onClose }) => {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const open = !!eventId;

  useEffect(() => {
    if (!eventId) { setDetail(null); return; }
    setLoading(true);
    supabase.rpc('get_audit_event_detail', { event_id_in: eventId }).then(({ data, error }) => {
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      setDetail(data as unknown as Detail);
    });
  }, [eventId]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 1400 }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl overflow-y-auto cc-glass-strong"
           style={{ zIndex: 1500, background: 'hsl(var(--cc-bg))' }}>
        <div className="sticky top-0 flex items-center justify-between p-5 border-b"
             style={{ background: 'hsl(var(--cc-bg))', borderColor: 'hsl(var(--cc-border))' }}>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Audit Event</div>
            <div className="text-[16px] font-semibold truncate">{detail?.event_type || '…'}</div>
            <code className="text-[10.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{eventId}</code>
          </div>
          <button onClick={onClose} className="cc-btn"><X className="w-4 h-4" /></button>
        </div>

        {loading && <div className="p-6 text-sm" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Loading…</div>}

        {detail && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge variant={sevVariant(detail.severity) as any} dot>{detail.severity}</StatusBadge>
              <StatusBadge variant="muted">{detail.source}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="cc-glass p-3">
                <div className="flex items-center gap-2 mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                  <User className="w-3.5 h-3.5" /> Actor
                </div>
                <div className="font-semibold break-all">{detail.actor_full_name || detail.actor_label || '—'}</div>
                {detail.actor_label && detail.actor_full_name && (
                  <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{detail.actor_label}</div>
                )}
              </div>
              <div className="cc-glass p-3">
                <div className="flex items-center gap-2 mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                  <Building2 className="w-3.5 h-3.5" /> Organisation
                </div>
                <div className="font-semibold break-all">{detail.organisation_name || '—'}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="flex items-center gap-2 mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                  <Activity className="w-3.5 h-3.5" /> Occurred
                </div>
                <div className="font-semibold">{fmtDate(detail.occurred_at)}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Source / Type</div>
                <div className="font-semibold break-all">{detail.event_type}</div>
              </div>
            </div>

            <div className="cc-glass p-4">
              <div className="text-[13px] font-semibold mb-2">Metadata</div>
              <pre className="text-[11px] p-3 rounded overflow-auto"
                   style={{ background: 'hsl(var(--cc-navy) / 0.2)', maxHeight: 320 }}>
{JSON.stringify(detail.metadata ?? {}, null, 2)}
              </pre>
            </div>

            <div className="cc-glass p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(var(--cc-warning))' }} />
                <div className="text-[13px] font-semibold">Related unresolved alerts</div>
              </div>
              {(!detail.related_alerts || detail.related_alerts.length === 0) ? (
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>None.</div>
              ) : (
                <div className="space-y-2">
                  {detail.related_alerts.map((a) => (
                    <div key={a.id} className="text-[12px] py-2 border-b" style={{ borderColor: 'hsl(var(--cc-border) / 0.4)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">{a.title || a.alert_type}</div>
                        <StatusBadge variant={sevVariant(a.severity) as any}>{a.severity}</StatusBadge>
                      </div>
                      {a.description && <div style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.description}</div>}
                      <div className="text-[10.5px] mt-1" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{fmtDate(a.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
