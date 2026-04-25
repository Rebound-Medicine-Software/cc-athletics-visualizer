import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { StatusBadge } from '../primitives/StatusBadge';
import { LifeBuoy, AlertOctagon, Bug, MessageSquare, Clock } from 'lucide-react';

const tickets = [
  { id: 'TCK-2041', subject: 'Cal.com sync stopped working', org: 'Velocity Lab', priority: 'high', status: 'open',  age: '2h' },
  { id: 'TCK-2040', subject: 'AI Coach insight returning empty', org: 'Apex Performance', priority: 'high', status: 'in_progress', age: '5h' },
  { id: 'TCK-2039', subject: 'Cannot upload athlete avatar', org: 'Stride Labs', priority: 'med', status: 'open',  age: '11h' },
  { id: 'TCK-2038', subject: 'Billing tier upgrade question', org: 'Northgate Athletics', priority: 'low', status: 'in_progress', age: '1d' },
  { id: 'TCK-2037', subject: 'Report PDF showing wrong logo', org: 'Iron Forge', priority: 'med', status: 'resolved', age: '2d' },
];

const escalations = [
  { id: 'BUG-401', title: 'Force plate metric clamp bug', priority: 'critical' },
  { id: 'BUG-396', title: 'Notification bounce on .edu', priority: 'high' },
];

export const Support: React.FC = () => (
  <>
    <PageHeader title="Support Desk" subtitle="Internal CRM for tenant tickets and escalations." />

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <KpiCard label="Open Tickets" value={4} icon={LifeBuoy} accent="warning" />
      <KpiCard label="High Priority" value={2} icon={AlertOctagon} accent="danger" />
      <KpiCard label="Bug Escalations" value={2} icon={Bug} accent="danger" />
      <KpiCard label="Avg Response" value="38m" delta={-12.0} icon={Clock} accent="success" />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="cc-glass p-4 xl:col-span-2">
        <h3 className="cc-h2 mb-3">Active Tickets</h3>
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{t.id}</code>
                    <StatusBadge variant={t.priority === 'high' ? 'danger' : t.priority === 'med' ? 'warning' : 'muted'}>{t.priority}</StatusBadge>
                    <StatusBadge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'} dot>{t.status}</StatusBadge>
                  </div>
                  <div className="text-[13.5px] font-semibold">{t.subject}</div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{t.org} • {t.age}</div>
                </div>
                <button className="cc-btn"><MessageSquare className="w-3.5 h-3.5" /> Reply</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-3 flex items-center gap-2"><Bug className="w-4 h-4" style={{ color: 'hsl(var(--cc-danger))' }} /> Engineering Escalations</h3>
        <div className="space-y-2">
          {escalations.map((e) => (
            <div key={e.id} className="p-3 rounded-lg" style={{ background: 'hsl(var(--cc-danger) / 0.08)', border: '1px solid hsl(var(--cc-danger) / 0.3)' }}>
              <div className="flex items-center justify-between mb-1">
                <code className="text-[11px]">{e.id}</code>
                <StatusBadge variant="danger">{e.priority}</StatusBadge>
              </div>
              <div className="text-[13px] font-semibold">{e.title}</div>
            </div>
          ))}
        </div>

        <h3 className="cc-h2 mt-5 mb-2">Account Notes</h3>
        <div className="space-y-2 text-[12.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>
          <div>• Velocity Lab considering Elite upgrade — follow up Friday</div>
          <div>• Apex paused billing — awaiting renewal decision</div>
          <div>• Northgate requested API quota increase</div>
        </div>
      </div>
    </div>
  </>
);
