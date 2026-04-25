import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendArea } from '../primitives/Charts';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { CalendarRange, AlertTriangle, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const trend = Array.from({ length: 14 }, (_, i) => ({ name: `D${i + 1}`, value: 40 + Math.round(Math.sin(i / 2) * 12) + i * 2 }));

export const Bookings: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from('bookings').select('id', { count: 'exact', head: true }).then(({ count }) => setCount(count ?? 0));
  }, []);

  const failures = [
    { id: '1', org: 'Velocity Lab', error: 'Cal.com 401 — token expired', time: '12m ago', sev: 'critical' },
    { id: '2', org: 'Apex Performance', error: 'Webhook timeout (5s)', time: '47m ago', sev: 'warning' },
    { id: '3', org: 'Stride Labs', error: 'Duplicate booking detected', time: '2h ago', sev: 'warning' },
    { id: '4', org: 'Northgate Athletics', error: 'Practitioner conflict — slot taken', time: '5h ago', sev: 'info' },
  ];

  return (
    <>
      <PageHeader title="Bookings Infrastructure" subtitle="Cal.com sync health, slot utilisation & conflict monitoring." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Bookings Created (30d)" value={count} delta={9.2} icon={CalendarRange} accent="navy" />
        <KpiCard label="Failed Syncs" value={4} delta={-31} icon={AlertTriangle} accent="danger" />
        <KpiCard label="Practitioner Conflicts" value={2} icon={Users} accent="warning" />
        <KpiCard label="Abandoned Bookings" value={11} icon={Clock} accent="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="cc-glass p-4 lg:col-span-2">
          <h3 className="cc-h2 mb-1">Booking Volume (14 days)</h3>
          <p className="cc-subtle mb-2">Daily creations across all tenants</p>
          <TrendArea data={trend} dataKey="value" color="hsl(var(--cc-navy-glow))" />
        </div>
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-3">Quota Usage</h3>
          {[
            { label: 'Basic tier (4/mo)', usage: 78 },
            { label: 'Premium tier (8/mo)', usage: 62 },
            { label: 'Elite tier (20/mo)', usage: 41 },
          ].map((q) => (
            <div key={q.label} className="mb-3 last:mb-0">
              <div className="flex justify-between text-[12px] mb-1">
                <span>{q.label}</span>
                <span className="font-mono" style={{ color: 'hsl(var(--cc-gold))' }}>{q.usage}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--cc-surface-2))' }}>
                <div style={{ width: `${q.usage}%`, height: '100%', background: 'var(--cc-grad-gold)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <DataTable
        rows={failures}
        columns={[
          { key: 'org', label: 'Organisation' },
          { key: 'error', label: 'Error', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.error}</code> },
          { key: 'sev', label: 'Severity', render: (r: any) => <StatusBadge variant={r.sev === 'critical' ? 'danger' : r.sev === 'warning' ? 'warning' : 'info'}>{r.sev}</StatusBadge> },
          { key: 'time', label: 'When', align: 'right' },
        ]}
      />
    </>
  );
};
