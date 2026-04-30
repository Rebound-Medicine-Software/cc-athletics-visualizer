import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { NotificationCampaignDrawer } from '../primitives/NotificationCampaignDrawer';
import { WebhookEndpointsPanel } from '../primitives/WebhookEndpointsPanel';
import { Megaphone, Send, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TargetType = 'all' | 'tier' | 'organisation' | 'status' | 'churn_risk';
type Channel = 'email' | 'in_app' | 'webhook';

interface Campaign {
  id: string;
  title: string;
  message: string;
  target_type: string;
  target_value: string | null;
  delivery_channel: string;
  status: string;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  created_by_email: string | null;
  created_at: string;
  sent_at: string | null;
}

interface Org { id: string; name: string }

const channelOptions: { value: Channel; label: string }[] = [
  { value: 'email', label: 'Email (NotificationAPI)' },
  { value: 'in_app', label: 'In-App (delivers to org owner inbox)' },
  { value: 'webhook', label: 'Webhook (requires configured endpoint)' },
];

const statusVariant = (s: string) =>
  s === 'sent' ? 'success' : s === 'failed' ? 'danger' :
  s === 'sending' || s === 'queued' ? 'warning' : 'muted';

const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString() : '—';

export const Notifications: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetValue, setTargetValue] = useState<string>('');
  const [channel, setChannel] = useState<Channel>('email');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [tiers, setTiers] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [webhookCount, setWebhookCount] = useState<number>(0);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_notification_campaigns');
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setCampaigns((data as Campaign[]) ?? []);
  };

  const loadFilterOptions = async () => {
    const [{ data: t }, { data: o }, { data: wc }] = await Promise.all([
      supabase.from('tiers').select('name'),
      supabase.from('teams').select('id,name').order('name'),
      supabase.rpc('count_active_webhook_endpoints'),
    ]);
    setTiers(Array.from(new Set(((t ?? []) as any[]).map((r) => r.name).filter(Boolean))));
    setOrgs(((o ?? []) as Org[]));
    setWebhookCount((wc as unknown as number) ?? 0);
  };

  useEffect(() => { loadCampaigns(); loadFilterOptions(); }, []);

  const refreshPreview = async () => {
    setPreviewLoading(true);
    const { data, error } = await supabase.rpc('preview_notification_audience', {
      p_target_type: targetType,
      p_target_value: targetValue || null,
    });
    setPreviewLoading(false);
    if (error) { toast.error(error.message); setPreviewCount(null); return; }
    setPreviewCount((data as any[])?.length ?? 0);
  };

  // Auto-refresh preview when target changes
  useEffect(() => { setPreviewCount(null); }, [targetType, targetValue]);

  const handleCreateDraft = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('create_notification_campaign', {
      p_title: title.trim(),
      p_message: message.trim(),
      p_target_type: targetType,
      p_target_value: targetValue || null,
      p_delivery_channel: channel,
      p_metadata: {},
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Draft saved');
    setTitle(''); setMessage(''); setTargetValue('');
    await loadCampaigns();
    if (data) setOpenId(data as unknown as string);
  };

  const handleSendNow = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    setSubmitting(true);
    try {
      const { data: id, error } = await supabase.rpc('create_notification_campaign', {
        p_title: title.trim(),
        p_message: message.trim(),
        p_target_type: targetType,
        p_target_value: targetValue || null,
        p_delivery_channel: channel,
        p_metadata: {},
      });
      if (error) throw error;
      const campaignId = id as unknown as string;

      const { error: qErr } = await supabase.rpc('queue_notification_campaign', { campaign_uuid: campaignId });
      if (qErr) throw qErr;

      const { data: dispatchRes, error: dErr } = await supabase.functions.invoke('dispatch-notification-campaign', {
        body: { campaign_id: campaignId },
      });
      if (dErr) throw dErr;

      toast.success(`Sent: ${dispatchRes?.delivered ?? 0} delivered, ${dispatchRes?.failed ?? 0} failed`);
      setTitle(''); setMessage(''); setTargetValue('');
      await loadCampaigns();
      setOpenId(campaignId);
    } catch (e: any) {
      toast.error(e.message ?? 'Send failed');
    } finally {
      setSubmitting(false);
    }
  };

  const targetValueInput = useMemo(() => {
    if (targetType === 'all') return null;
    if (targetType === 'tier') {
      return (
        <select className="cc-input mt-1" style={{ paddingLeft: 12 }} value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
          <option value="">— Select tier —</option>
          {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      );
    }
    if (targetType === 'organisation') {
      return (
        <select className="cc-input mt-1" style={{ paddingLeft: 12 }} value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
          <option value="">— Select organisation —</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      );
    }
    if (targetType === 'status') {
      return (
        <select className="cc-input mt-1" style={{ paddingLeft: 12 }} value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
          <option value="">— Select status —</option>
          {['trial','active','past_due','suspended','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    }
    // churn_risk
    return (
      <input
        type="number" min={0} max={100}
        className="cc-input mt-1" style={{ paddingLeft: 12 }}
        placeholder="Churn risk threshold (e.g. 60)"
        value={targetValue}
        onChange={(e) => setTargetValue(e.target.value)}
      />
    );
  }, [targetType, targetValue, tiers, orgs]);

  return (
    <>
      <PageHeader
        title="Notifications Centre"
        subtitle="Send platform-wide communications and announcements."
        actions={
          <button className="cc-btn" onClick={loadCampaigns}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="cc-glass p-4 lg:col-span-2">
          <h3 className="cc-h2 mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4" /> Compose Campaign</h3>

          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Subject / Title</label>
          <input className="cc-input mt-1 mb-3" style={{ paddingLeft: 12 }} placeholder="Campaign title…" value={title} onChange={(e) => setTitle(e.target.value)} />

          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Message</label>
          <textarea
            rows={6}
            className="w-full mt-1 mb-3 p-3 rounded-lg text-[13px] resize-none"
            style={{ background: 'hsl(var(--cc-surface) / 0.6)', border: '1px solid hsl(var(--cc-border))', color: 'hsl(var(--cc-fg))' }}
            placeholder="Write your message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Delivery Channel</label>
              <select className="cc-input mt-1" style={{ paddingLeft: 12 }} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                {channelOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Recipient Preview</label>
              <div className="mt-1 flex items-center gap-2">
                <button className="cc-btn" disabled={previewLoading} onClick={refreshPreview}>
                  <Users className="w-3.5 h-3.5" /> {previewLoading ? '…' : 'Preview'}
                </button>
                {previewCount !== null && (
                  <StatusBadge variant="info">{previewCount} recipients</StatusBadge>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button className="cc-btn" disabled={submitting} onClick={handleCreateDraft}>Save Draft</button>
            <button className="cc-btn cc-btn-primary" disabled={submitting} onClick={handleSendNow}>
              <Send className="w-3.5 h-3.5" /> {submitting ? 'Sending…' : 'Send Campaign'}
            </button>
          </div>
        </div>

        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-3">Audience Targeting</h3>

          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Target Type</label>
          <select
            className="cc-input mt-1 mb-3" style={{ paddingLeft: 12 }}
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value as TargetType); setTargetValue(''); }}
          >
            <option value="all">All organisations</option>
            <option value="tier">By tier</option>
            <option value="organisation">Specific organisation</option>
            <option value="status">By subscription status</option>
            <option value="churn_risk">By churn risk threshold</option>
          </select>

          {targetValueInput && (
            <>
              <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Target Value</label>
              {targetValueInput}
            </>
          )}

          <div className="text-[11px] mt-4 leading-relaxed space-y-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
            <div>• <strong>Email</strong> dispatched via NotificationAPI to each organisation's owner email.</div>
            <div>• <strong>In-App</strong> creates a notification in the target organisation owner's inbox.</div>
            <div>• <strong>Webhook</strong> {webhookCount > 0
              ? <>POSTs to <StatusBadge variant="success">{webhookCount} active endpoint(s)</StatusBadge></>
              : <StatusBadge variant="warning">no endpoints configured — sends will fail</StatusBadge>}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <WebhookEndpointsPanel />
      </div>

      <DataTable
        rows={loading ? [] : campaigns}
        empty={loading ? 'Loading campaigns…' : 'No campaigns yet'}
        onRowClick={(r: any) => setOpenId(r.id)}
        columns={[
          { key: 'title', label: 'Title', render: (r: Campaign) => <span className="font-medium">{r.title}</span> },
          { key: 'target', label: 'Audience', render: (r: Campaign) => (
            <StatusBadge variant="muted">{r.target_type}{r.target_value ? `: ${r.target_value}` : ''}</StatusBadge>
          ) },
          { key: 'delivery_channel', label: 'Channel' },
          { key: 'status', label: 'Status', render: (r: Campaign) => (
            <StatusBadge variant={statusVariant(r.status) as any} dot>{r.status}</StatusBadge>
          ) },
          { key: 'recipient_count', label: 'Recipients', align: 'right' },
          { key: 'delivered_count', label: 'Delivered', align: 'right' },
          { key: 'failed_count', label: 'Failed', align: 'right' },
          { key: 'created_at', label: 'Created', align: 'right', render: (r: Campaign) => fmt(r.created_at) },
          { key: 'sent_at', label: 'Sent', align: 'right', render: (r: Campaign) => fmt(r.sent_at) },
        ]}
      />

      <NotificationCampaignDrawer
        campaignId={openId}
        onClose={() => setOpenId(null)}
        onChanged={loadCampaigns}
      />
    </>
  );
};
