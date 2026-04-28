import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { StatusBadge } from '../primitives/StatusBadge';
import { SupportTicketDrawer } from '../primitives/SupportTicketDrawer';
import { LifeBuoy, AlertOctagon, Inbox, Clock, MessageSquare, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TicketRow {
  id: string;
  team_id: string;
  organisation_name: string | null;
  subject: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  opened_by: string | null;
  opened_by_name: string | null;
  conversation_count: number;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

const priorityVariant = (p: string) =>
  p === 'urgent' || p === 'high' ? 'danger' : p === 'normal' ? 'info' : 'muted';
const statusVariant = (s: string) =>
  s === 'resolved' || s === 'closed' ? 'success' : s === 'in_progress' ? 'info' : 'warning';

const relTime = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
};

export const Support: React.FC = () => {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [assignFilter, setAssignFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_support_tickets');
    setLoading(false);
    if (error) {
      toast.error(`Failed to load tickets: ${error.message}`);
      return;
    }
    setRows((data as unknown as TicketRow[]) || []);
  };

  useEffect(() => { load(); }, []);

  const orgs = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.organisation_name && set.add(r.organisation_name));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (orgFilter !== 'all' && r.organisation_name !== orgFilter) return false;
      if (assignFilter === 'assigned' && !r.assigned_to) return false;
      if (assignFilter === 'unassigned' && r.assigned_to) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.subject || ''} ${r.organisation_name || ''} ${r.last_message_preview || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, priorityFilter, orgFilter, assignFilter, search]);

  const kpis = useMemo(() => {
    const open = rows.filter((r) => r.status !== 'resolved' && r.status !== 'closed').length;
    const high = rows.filter(
      (r) => (r.priority === 'high' || r.priority === 'urgent')
        && r.status !== 'resolved' && r.status !== 'closed',
    ).length;
    const unassigned = rows.filter(
      (r) => !r.assigned_to && r.status !== 'resolved' && r.status !== 'closed',
    ).length;
    // Median age (open) in hours
    const openTimes = rows
      .filter((r) => r.status !== 'resolved' && r.status !== 'closed')
      .map((r) => (Date.now() - new Date(r.created_at).getTime()) / 3_600_000);
    openTimes.sort((a, b) => a - b);
    const median = openTimes.length ? openTimes[Math.floor(openTimes.length / 2)] : 0;
    const medianLabel = median < 1
      ? `${Math.round(median * 60)}m`
      : median < 48 ? `${Math.round(median)}h` : `${Math.round(median / 24)}d`;
    return { open, high, unassigned, medianLabel };
  }, [rows]);

  return (
    <>
      <PageHeader title="Support Desk" subtitle="Live tenant support tickets and operations." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Open Tickets" value={kpis.open} icon={LifeBuoy} accent="warning" />
        <KpiCard label="High / Urgent" value={kpis.high} icon={AlertOctagon} accent="danger" />
        <KpiCard label="Unassigned" value={kpis.unassigned} icon={Inbox} accent="info" />
        <KpiCard label="Median Age (open)" value={kpis.medianLabel} icon={Clock} accent="navy" />
      </div>

      {/* Filter bar */}
      <div className="cc-glass p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'hsl(var(--cc-fg-dim))' }} />
          <input
            className="cc-input"
            placeholder="Search subject, org, last message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="cc-input" style={{ width: 'auto' }}
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="waiting">waiting</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
        <select className="cc-input" style={{ width: 'auto' }}
          value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All priorities</option>
          <option value="urgent">urgent</option>
          <option value="high">high</option>
          <option value="normal">normal</option>
          <option value="low">low</option>
        </select>
        <select className="cc-input" style={{ width: 'auto' }}
          value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
          <option value="all">All organisations</option>
          {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="cc-input" style={{ width: 'auto' }}
          value={assignFilter} onChange={(e) => setAssignFilter(e.target.value as any)}>
          <option value="all">Any assignment</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <button className="cc-btn" onClick={load} disabled={loading}>
          <RefreshCw className="w-3.5 h-3.5" /> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-3">Tickets ({filtered.length})</h3>
        {filtered.length === 0 && !loading && (
          <div className="cc-subtle">No tickets match your filters.</div>
        )}
        <div className="space-y-2">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenId(t.id)}
              className="w-full text-left p-3 rounded-lg transition-colors"
              style={{
                background: 'hsl(var(--cc-surface) / 0.5)',
                border: '1px solid hsl(var(--cc-border))',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                      {t.id.slice(0, 8)}
                    </code>
                    <StatusBadge variant={priorityVariant(t.priority) as any}>{t.priority}</StatusBadge>
                    <StatusBadge variant={statusVariant(t.status) as any} dot>{t.status}</StatusBadge>
                    {!t.assigned_to && <StatusBadge variant="warning">unassigned</StatusBadge>}
                  </div>
                  <div className="text-[13.5px] font-semibold truncate">
                    {t.subject || '(no subject)'}
                  </div>
                  <div className="text-[11.5px] mt-0.5"
                    style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                    {t.organisation_name || '—'} · {t.conversation_count} msg
                    {t.assigned_to_name ? ` · @${t.assigned_to_name}` : ''}
                    {' · '}{relTime(t.updated_at)} ago
                  </div>
                  {t.last_message_preview && (
                    <div className="text-[12px] mt-1 truncate"
                      style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                      {t.last_message_preview}
                    </div>
                  )}
                </div>
                <span className="cc-btn"><MessageSquare className="w-3.5 h-3.5" /> Open</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <SupportTicketDrawer
        ticketId={openId}
        onClose={() => setOpenId(null)}
        onChanged={load}
      />
    </>
  );
};
