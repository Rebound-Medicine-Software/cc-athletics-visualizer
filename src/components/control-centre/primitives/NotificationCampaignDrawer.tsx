import React, { useEffect, useState } from 'react';
import { X, Send, Users, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';

interface Props {
  campaignId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

const statusVariant = (s: string) =>
  s === 'sent' ? 'success' : s === 'failed' ? 'danger' :
  s === 'sending' || s === 'queued' ? 'warning' : 'muted';

export const NotificationCampaignDrawer: React.FC<Props> = ({ campaignId, onClose, onChanged }) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const open = !!campaignId;

  const load = async () => {
    if (!campaignId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_notification_campaign_detail', { campaign_uuid: campaignId });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDetail(data);
  };

  useEffect(() => { if (campaignId) load(); else setDetail(null); }, [campaignId]);

  const handleQueueAndSend = async () => {
    if (!campaignId) return;
    setSending(true);
    try {
      const { error: qErr } = await supabase.rpc('queue_notification_campaign', { campaign_uuid: campaignId });
      if (qErr) throw qErr;
      const { data, error: dErr } = await supabase.functions.invoke('dispatch-notification-campaign', {
        body: { campaign_id: campaignId },
      });
      if (dErr) throw dErr;
      toast.success(`Dispatched: ${data?.delivered ?? 0} delivered, ${data?.failed ?? 0} failed`);
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to dispatch');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  const c = detail?.campaign;
  const audience: any[] = detail?.audience_preview ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 1400 }} onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl overflow-y-auto cc-glass-strong"
           style={{ zIndex: 1500, background: 'hsl(var(--cc-bg))' }}>
        <div className="sticky top-0 flex items-center justify-between p-5 border-b"
             style={{ background: 'hsl(var(--cc-bg))', borderColor: 'hsl(var(--cc-border))' }}>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Notification Campaign</div>
            <div className="text-[16px] font-semibold truncate">{c?.title || '…'}</div>
            <code className="text-[10.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{campaignId}</code>
          </div>
          <button onClick={onClose} className="cc-btn"><X className="w-4 h-4" /></button>
        </div>

        {loading && <div className="p-6 text-sm" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Loading…</div>}

        {c && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge variant={statusVariant(c.status) as any} dot>{c.status}</StatusBadge>
              <StatusBadge variant="muted">{c.delivery_channel}</StatusBadge>
              <StatusBadge variant="info">{c.target_type}{c.target_value ? `: ${c.target_value}` : ''}</StatusBadge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div className="cc-glass p-3">
                <div className="mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Recipients</div>
                <div className="text-[18px] font-semibold">{c.recipient_count}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Delivered</div>
                <div className="text-[18px] font-semibold" style={{ color: 'hsl(var(--cc-success))' }}>{c.delivered_count}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Failed</div>
                <div className="text-[18px] font-semibold" style={{ color: 'hsl(var(--cc-danger))' }}>{c.failed_count}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="cc-glass p-3">
                <div className="mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Created</div>
                <div className="font-semibold">{fmtDate(c.created_at)}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Sent</div>
                <div className="font-semibold">{fmtDate(c.sent_at)}</div>
              </div>
            </div>

            <div className="cc-glass p-4">
              <div className="text-[13px] font-semibold mb-2 flex items-center gap-2"><Mail className="w-4 h-4" /> Message</div>
              <pre className="text-[12px] p-3 rounded whitespace-pre-wrap"
                   style={{ background: 'hsl(var(--cc-navy) / 0.2)' }}>{c.message}</pre>
            </div>

            {c.error_summary && (
              <div className="cc-glass p-4" style={{ borderColor: 'hsl(var(--cc-danger) / 0.4)' }}>
                <div className="text-[13px] font-semibold mb-1" style={{ color: 'hsl(var(--cc-danger))' }}>Errors</div>
                <pre className="text-[11px] whitespace-pre-wrap">{c.error_summary}</pre>
              </div>
            )}

            <div className="cc-glass p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                <div className="text-[13px] font-semibold">Audience preview ({audience.length})</div>
              </div>
              {audience.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>No recipients matched.</div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {audience.slice(0, 50).map((a) => (
                    <div key={a.team_id} className="flex items-center justify-between text-[12px] py-1.5 border-b"
                         style={{ borderColor: 'hsl(var(--cc-border) / 0.3)' }}>
                      <div className="font-medium truncate">{a.organisation_name || '—'}</div>
                      <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.owner_email || 'no email'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(c.status === 'draft' || c.status === 'failed') && (
              <div className="flex justify-end">
                <button className="cc-btn cc-btn-primary" disabled={sending} onClick={handleQueueAndSend}>
                  <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Queue & Send Now'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
