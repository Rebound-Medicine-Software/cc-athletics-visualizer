import React, { useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { Megaphone, Send, Wrench, CreditCard, Sparkles, Heart } from 'lucide-react';
import { toast } from 'sonner';

const templates = [
  { id: 'maint',     icon: Wrench,    label: 'Maintenance Alert',     desc: 'Scheduled downtime or platform updates' },
  { id: 'pay',       icon: CreditCard,label: 'Payment Reminder',      desc: 'Overdue invoices or failed charges' },
  { id: 'feature',   icon: Sparkles,  label: 'Feature Announcement',  desc: 'New capability rollout' },
  { id: 'engage',    icon: Heart,     label: 'Engagement Nudge',      desc: 'Re-engage low-activity tenants' },
];

const sent = Array.from({ length: 8 }, (_, i) => ({
  id: `cmp_${100 + i}`,
  campaign: ['April Maintenance', 'Q2 Pricing Update', 'AI Coach Launch', 'Engagement Nudge — Velocity'][i % 4],
  audience: ['All orgs', 'Premium tier', 'Trial accounts', 'Inactive 30d'][i % 4],
  recipients: 18 + i * 7,
  open_rate: `${42 + (i * 5) % 40}%`,
  sent: `${i + 1}d ago`,
}));

export const Notifications: React.FC = () => {
  const [tpl, setTpl] = useState('maint');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const send = () => toast.success('Campaign queued', { description: `${subject || 'Untitled'} — visual-only in this build.` });

  return (
    <>
      <PageHeader title="Notifications Centre" subtitle="Send platform-wide communications and announcements." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="cc-glass p-4 lg:col-span-2">
          <h3 className="cc-h2 mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4" /> Compose Campaign</h3>

          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Template</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 mb-4">
            {templates.map((t) => {
              const Icon = t.icon;
              const active = tpl === t.id;
              return (
                <button key={t.id} onClick={() => setTpl(t.id)}
                  className="text-left p-3 rounded-lg transition-all"
                  style={{
                    background: active ? 'hsl(var(--cc-navy) / 0.4)' : 'hsl(var(--cc-surface) / 0.5)',
                    border: `1px solid ${active ? 'hsl(var(--cc-gold) / 0.5)' : 'hsl(var(--cc-border))'}`,
                  }}>
                  <Icon className="w-4 h-4 mb-1.5" style={{ color: active ? 'hsl(var(--cc-gold))' : 'hsl(var(--cc-navy-glow))' }} />
                  <div className="text-[12px] font-semibold">{t.label}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{t.desc}</div>
                </button>
              );
            })}
          </div>

          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Subject</label>
          <input className="cc-input mt-1 mb-3" style={{ paddingLeft: 12 }} placeholder="Subject line…" value={subject} onChange={(e) => setSubject(e.target.value)} />

          <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Message</label>
          <textarea
            rows={6}
            className="w-full mt-1 p-3 rounded-lg text-[13px] resize-none"
            style={{ background: 'hsl(var(--cc-surface) / 0.6)', border: '1px solid hsl(var(--cc-border))', color: 'hsl(var(--cc-fg))' }}
            placeholder="Write your message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-3">
            <button className="cc-btn">Save Draft</button>
            <button className="cc-btn cc-btn-primary" onClick={send}><Send className="w-3.5 h-3.5" /> Send Campaign</button>
          </div>
        </div>

        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-3">Audience</h3>
          {[
            { label: 'All organisations', count: 31 },
            { label: 'Trial accounts', count: 6 },
            { label: 'Premium tier', count: 9 },
            { label: 'Elite tier', count: 4 },
            { label: 'Inactive 30d', count: 5 },
          ].map((a) => (
            <label key={a.label} className="flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-white/5">
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={a.label === 'All organisations'} />
                <span className="text-[12.5px]">{a.label}</span>
              </div>
              <span className="cc-badge cc-badge-muted">{a.count}</span>
            </label>
          ))}
        </div>
      </div>

      <DataTable
        rows={sent}
        columns={[
          { key: 'id', label: 'ID', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.id}</code> },
          { key: 'campaign', label: 'Campaign' },
          { key: 'audience', label: 'Audience' },
          { key: 'recipients', label: 'Recipients', align: 'right' },
          { key: 'open_rate', label: 'Open Rate', align: 'right', render: (r: any) => <StatusBadge variant="gold">{r.open_rate}</StatusBadge> },
          { key: 'sent', label: 'Sent', align: 'right' },
        ]}
      />
    </>
  );
};
