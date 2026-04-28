import React, { useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { ImpersonationAuditPanel } from '../primitives/ImpersonationAuditPanel';
import { Search, Filter, Calendar } from 'lucide-react';

const events = Array.from({ length: 20 }, (_, i) => {
  const types = ['consent', 'invite', 'report', 'export', 'impersonate', 'delete', 'login'] as const;
  const type = types[i % types.length];
  return {
    id: `evt_${1000 + i}`,
    type,
    actor: ['admin@nexushub.io', 'dr.lopez@elitepf.com', 'system', 'super_admin', 'owner@apex.io'][i % 5],
    target: ['Athlete #A-2381', 'Velocity Lab', 'Report #R-9923', 'profiles.row', 'Booking #B-771'][i % 5],
    org: ['Apex', 'Velocity', 'Stride', 'Northgate'][i % 4],
    ip: `192.168.${i % 50}.${(i * 7) % 255}`,
    time: `${i + 1}h ago`,
  };
});

const variantOf = (t: string) =>
  t === 'delete' || t === 'impersonate' ? 'danger' :
  t === 'export' || t === 'invite' ? 'warning' :
  t === 'consent' || t === 'report' ? 'success' : 'info';

export const Compliance: React.FC = () => {
  const [filter, setFilter] = useState('');

  return (
    <>
      <PageHeader title="Compliance / Audit Logs" subtitle="Tamper-evident log of every privileged platform action." />

      <ImpersonationAuditPanel />

      <div className="cc-glass p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--cc-fg-dim))' }} />
          <input className="cc-input" placeholder="Search by actor, target, or event ID…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <button className="cc-btn"><Filter className="w-3.5 h-3.5" /> Event Type</button>
        <button className="cc-btn"><Calendar className="w-3.5 h-3.5" /> Last 7 days</button>
        <button className="cc-btn cc-btn-primary">Export CSV</button>
      </div>

      <DataTable
        rows={events.filter((e) => !filter || JSON.stringify(e).toLowerCase().includes(filter.toLowerCase()))}
        columns={[
          { key: 'id', label: 'Event ID', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.id}</code> },
          { key: 'type', label: 'Type', render: (r: any) => <StatusBadge variant={variantOf(r.type) as any}>{r.type}</StatusBadge> },
          { key: 'actor', label: 'Actor' },
          { key: 'target', label: 'Target' },
          { key: 'org', label: 'Org' },
          { key: 'ip', label: 'IP', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.ip}</code> },
          { key: 'time', label: 'When', align: 'right' },
        ]}
        maxHeight={600}
      />
    </>
  );
};
