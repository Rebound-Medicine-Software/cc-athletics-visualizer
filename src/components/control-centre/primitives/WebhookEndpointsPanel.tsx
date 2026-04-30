import React, { useEffect, useState } from 'react';
import { Plus, Power, Trash2, RefreshCw, Webhook, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';

interface Endpoint {
  id: string;
  label: string;
  url: string;
  team_id: string | null;
  team_name: string | null;
  is_active: boolean;
  has_secret: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface Org { id: string; name: string }

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : '—';

export const WebhookEndpointsPanel: React.FC = () => {
  const [items, setItems] = useState<Endpoint[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: o }] = await Promise.all([
      supabase.rpc('list_webhook_endpoints'),
      supabase.from('teams').select('id,name').order('name'),
    ]);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setItems((data as Endpoint[]) ?? []);
    setOrgs(((o ?? []) as Org[]));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setLabel(''); setUrl(''); setSecret(''); setTeamId(''); setIsActive(true); setShowForm(false);
  };

  const handleCreate = async () => {
    if (!label.trim() || !url.trim()) { toast.error('Label and URL are required'); return; }
    setCreating(true);
    const { error } = await supabase.rpc('create_webhook_endpoint', {
      p_label: label.trim(),
      p_url: url.trim(),
      p_secret: secret.trim() || null,
      p_team_id: teamId || null,
      p_is_active: isActive,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Webhook endpoint created');
    resetForm();
    load();
  };

  const handleToggle = async (ep: Endpoint) => {
    const { error } = await supabase.rpc('toggle_webhook_endpoint', {
      p_endpoint_id: ep.id, p_is_active: !ep.is_active,
    });
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.map(e => e.id === ep.id ? { ...e, is_active: !ep.is_active } : e));
  };

  const handleDelete = async (ep: Endpoint) => {
    if (!confirm(`Delete endpoint "${ep.label}"? This cannot be undone.`)) return;
    const { error } = await supabase.rpc('delete_webhook_endpoint', { p_endpoint_id: ep.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Endpoint deleted');
    setItems(prev => prev.filter(e => e.id !== ep.id));
  };

  return (
    <div className="cc-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="cc-h2 flex items-center gap-2"><Webhook className="w-4 h-4" /> Webhook Endpoints</h3>
        <div className="flex gap-2">
          <button className="cc-btn" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button className="cc-btn cc-btn-primary" onClick={() => setShowForm(s => !s)}>
            <Plus className="w-3.5 h-3.5" /> {showForm ? 'Close' : 'Add Endpoint'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Label</label>
            <input className="cc-input mt-1" style={{ paddingLeft: 12 }} placeholder="My CRM webhook" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>URL (https://...)</label>
            <input className="cc-input mt-1" style={{ paddingLeft: 12 }} placeholder="https://example.com/webhook" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Shared Secret (optional)</label>
            <input type="password" className="cc-input mt-1" style={{ paddingLeft: 12 }} placeholder="Sent as X-Webhook-Secret" value={secret} onChange={e => setSecret(e.target.value)} />
            <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Stored securely; never displayed again after save.</div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Scope (optional org)</label>
            <select className="cc-input mt-1" style={{ paddingLeft: 12 }} value={teamId} onChange={e => setTeamId(e.target.value)}>
              <option value="">Global (all campaigns)</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Active immediately
            </label>
            <div className="flex gap-2">
              <button className="cc-btn" onClick={resetForm} disabled={creating}>Cancel</button>
              <button className="cc-btn cc-btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Saving…' : 'Create Endpoint'}</button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-xs py-8 text-center" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
          {loading ? 'Loading…' : 'No webhook endpoints configured.'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(ep => (
            <div key={ep.id} className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm truncate">{ep.label}</span>
                  <StatusBadge variant={ep.is_active ? 'success' : 'muted'} dot>{ep.is_active ? 'active' : 'disabled'}</StatusBadge>
                  {ep.has_secret && <StatusBadge variant="info">secret</StatusBadge>}
                  {ep.team_name && <StatusBadge variant="muted">{ep.team_name}</StatusBadge>}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{ep.url}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {fmt(ep.last_success_at)}</span>
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> {fmt(ep.last_failure_at)}{ep.failure_reason ? ` — ${ep.failure_reason}` : ''}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="cc-btn" onClick={() => handleToggle(ep)} title={ep.is_active ? 'Disable' : 'Enable'}>
                  <Power className="w-3.5 h-3.5" /> {ep.is_active ? 'Disable' : 'Enable'}
                </button>
                <button className="cc-btn" onClick={() => handleDelete(ep)} title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebhookEndpointsPanel;
