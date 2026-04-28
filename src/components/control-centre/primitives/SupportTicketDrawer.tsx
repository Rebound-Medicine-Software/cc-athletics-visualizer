import React, { useEffect, useState } from 'react';
import { X, MessageSquare, StickyNote, Building2, UserCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';

interface Props {
  ticketId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

interface ConvEntry {
  kind?: string;
  body?: string;
  author_name?: string;
  author_email?: string;
  author_role?: string;
  at?: string;
  [k: string]: any;
}

interface TicketDetail {
  id: string;
  team_id: string;
  organisation_name: string | null;
  subject: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  opened_by: string | null;
  opened_by_name: string | null;
  opened_by_email: string | null;
  conversation: ConvEntry[];
  created_at: string;
  updated_at: string;
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');
const priorityVariant = (p: string) =>
  p === 'urgent' || p === 'high' ? 'danger' : p === 'normal' ? 'info' : 'muted';
const statusVariant = (s: string) =>
  s === 'resolved' || s === 'closed' ? 'success' : s === 'in_progress' ? 'info' : 'warning';

export const SupportTicketDrawer: React.FC<Props> = ({ ticketId, onClose, onChanged }) => {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [entryKind, setEntryKind] = useState<'note' | 'reply'>('note');
  const [entryBody, setEntryBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const open = !!ticketId;

  const load = async () => {
    if (!ticketId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_support_ticket_detail', { ticket_uuid: ticketId });
    setLoading(false);
    if (error) {
      toast.error(`Failed to load ticket: ${error.message}`);
      return;
    }
    setDetail(data as unknown as TicketDetail);
  };

  useEffect(() => {
    setDetail(null);
    setEntryBody('');
    if (ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const apply = async (patch: {
    new_status?: string;
    new_priority?: string;
    new_assigned_to?: string;
    clear_assigned?: boolean;
    append_entry_kind?: string;
    append_entry_body?: string;
  }) => {
    if (!ticketId) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('update_support_ticket', {
      ticket_uuid: ticketId,
      new_status: patch.new_status ?? null,
      new_priority: patch.new_priority ?? null,
      new_assigned_to: patch.new_assigned_to ?? null,
      clear_assigned: patch.clear_assigned ?? false,
      append_entry_kind: patch.append_entry_kind ?? null,
      append_entry_body: patch.append_entry_body ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Ticket updated');
    await load();
    onChanged?.();
  };

  const assignToMe = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    apply({ new_assigned_to: u.user.id });
  };

  const submitEntry = async () => {
    if (!entryBody.trim()) return;
    await apply({ append_entry_kind: entryKind, append_entry_body: entryBody.trim() });
    setEntryBody('');
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1400 }}
        />
      )}
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh',
          width: 'min(720px, 96vw)',
          background: 'hsl(var(--cc-bg))',
          borderLeft: '1px solid hsl(var(--cc-border))',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          zIndex: 1500, overflowY: 'auto',
        }}
      >
        {open && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between sticky top-0 py-2"
              style={{ background: 'hsl(var(--cc-bg))', zIndex: 10 }}>
              <h2 className="cc-h2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Ticket Detail
              </h2>
              <button className="cc-btn" onClick={onClose}><X className="w-3.5 h-3.5" /></button>
            </div>

            {loading && <div className="cc-subtle">Loading…</div>}

            {detail && (
              <>
                <div className="cc-glass p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge variant={priorityVariant(detail.priority) as any}>{detail.priority}</StatusBadge>
                    <StatusBadge variant={statusVariant(detail.status) as any} dot>{detail.status}</StatusBadge>
                    <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                      {detail.id.slice(0, 8)}
                    </code>
                  </div>
                  <div className="text-[15px] font-semibold">{detail.subject || '(no subject)'}</div>
                  <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                    <Building2 className="inline w-3 h-3 mr-1" />
                    {detail.organisation_name || '—'} · opened {fmtDate(detail.created_at)} · updated {fmtDate(detail.updated_at)}
                  </div>
                  <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                    <UserCircle className="inline w-3 h-3 mr-1" />
                    Opened by {detail.opened_by_name || detail.opened_by_email || '—'} · Assigned to{' '}
                    {detail.assigned_to_name || detail.assigned_to_email || (
                      <em style={{ color: 'hsl(var(--cc-warning))' }}>unassigned</em>
                    )}
                  </div>
                </div>

                {/* Action controls */}
                <div className="cc-glass p-3 space-y-2">
                  <div className="text-[11px] uppercase tracking-wide"
                    style={{ color: 'hsl(var(--cc-fg-dim))' }}>Actions</div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="cc-input"
                      value={detail.status}
                      onChange={(e) => apply({ new_status: e.target.value })}
                      disabled={submitting}
                      style={{ width: 'auto' }}
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in_progress</option>
                      <option value="waiting">waiting</option>
                      <option value="resolved">resolved</option>
                      <option value="closed">closed</option>
                    </select>
                    <select
                      className="cc-input"
                      value={detail.priority}
                      onChange={(e) => apply({ new_priority: e.target.value })}
                      disabled={submitting}
                      style={{ width: 'auto' }}
                    >
                      <option value="low">low</option>
                      <option value="normal">normal</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                    </select>
                    <button className="cc-btn" onClick={assignToMe} disabled={submitting}>
                      Assign to me
                    </button>
                    {detail.assigned_to && (
                      <button className="cc-btn" onClick={() => apply({ clear_assigned: true })} disabled={submitting}>
                        Unassign
                      </button>
                    )}
                  </div>
                </div>

                {/* Conversation */}
                <div className="cc-glass p-3">
                  <div className="text-[11px] uppercase tracking-wide mb-2"
                    style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                    Conversation ({detail.conversation.length})
                  </div>
                  {detail.conversation.length === 0 && (
                    <div className="cc-subtle">No messages yet.</div>
                  )}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto">
                    {detail.conversation.map((c, i) => (
                      <div key={i} className="p-2 rounded-md"
                        style={{
                          background: c.kind === 'note'
                            ? 'hsl(var(--cc-warning) / 0.08)'
                            : 'hsl(var(--cc-surface) / 0.5)',
                          border: '1px solid hsl(var(--cc-border))',
                        }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] flex items-center gap-1"
                            style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                            {c.kind === 'note' ? <StickyNote className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {c.kind || 'message'} · {c.author_name || c.author_email || c.author_role || '—'}
                          </span>
                          <span className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                            {fmtDate(c.at)}
                          </span>
                        </div>
                        <div className="text-[13px] whitespace-pre-wrap"
                          style={{ color: 'hsl(var(--cc-fg))' }}>
                          {c.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New entry */}
                <div className="cc-glass p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      className={`cc-btn ${entryKind === 'note' ? 'cc-btn-primary' : ''}`}
                      onClick={() => setEntryKind('note')}
                    >
                      <StickyNote className="w-3.5 h-3.5" /> Internal note
                    </button>
                    <button
                      className={`cc-btn ${entryKind === 'reply' ? 'cc-btn-primary' : ''}`}
                      onClick={() => setEntryKind('reply')}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Reply
                    </button>
                  </div>
                  <textarea
                    className="cc-input"
                    placeholder={entryKind === 'note'
                      ? 'Internal note (only visible in Control Centre)…'
                      : 'Reply to organisation (saved on ticket — email sending not yet wired)…'}
                    value={entryBody}
                    onChange={(e) => setEntryBody(e.target.value)}
                    rows={4}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                  <div className="flex justify-end">
                    <button
                      className="cc-btn cc-btn-primary"
                      onClick={submitEntry}
                      disabled={submitting || !entryBody.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting ? 'Saving…' : `Add ${entryKind}`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
