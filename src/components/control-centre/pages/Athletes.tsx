import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { TrendBars } from '../primitives/Charts';
import { Users, CheckCircle2, ClipboardList, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ageData = [
  { name: '<14', value: 42 }, { name: '14-17', value: 168 }, { name: '18-22', value: 240 },
  { name: '23-29', value: 310 }, { name: '30-39', value: 195 }, { name: '40+', value: 88 },
];

export const Athletes: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('athletes').select('id,name,email,team_id,consent_status,age,gender,created_at,cc_team_id').limit(300)
      .then(({ data }) => setRows(data || []));
  }, []);

  const signed = rows.filter((r) => r.consent_status === 'signed').length;

  return (
    <>
      <PageHeader title="Athletes Global Registry" subtitle="Cross-tenant view of every athlete and consent state." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Athletes" value={rows.length || '—'} icon={Users} accent="navy" />
        <KpiCard label="Consent Signed" value={signed} delta={6.2} icon={CheckCircle2} accent="success" />
        <KpiCard label="Pending Consent" value={rows.length - signed} icon={ClipboardList} accent="warning" />
        <KpiCard label="Active Last 30d" value={Math.floor(rows.length * 0.41)} delta={4.8} icon={Activity} accent="info" />
      </div>

      <div className="cc-glass p-4 mb-5">
        <h3 className="cc-h2 mb-1">Age Group Distribution</h3>
        <p className="cc-subtle mb-2">All registered athletes</p>
        <TrendBars data={ageData} dataKey="value" highlightIndex={2} />
      </div>

      <DataTable
        rows={rows.map((r, i) => ({
          ...r,
          practitioner: ['Dr. Hayes', 'Dr. Lopez', 'M. Bauer', 'C. Patel', 'L. Yamada'][i % 5],
          last_test: ['2d', '5h', '14d', '3w', '1d'][i % 5],
          tests: 4 + (i * 3) % 36,
          reports: (i * 2) % 12,
          activity: ['active', 'idle', 'dormant'][i % 3],
        }))}
        columns={[
          { key: 'name', label: 'Athlete' },
          { key: 'team_id', label: 'Org', render: (r) => <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.team_id?.slice(0, 8) || '—'}</code> },
          { key: 'practitioner', label: 'Practitioner' },
          { key: 'consent_status', label: 'Consent', render: (r) => <StatusBadge variant={r.consent_status === 'signed' ? 'success' : 'warning'} dot>{r.consent_status}</StatusBadge> },
          { key: 'last_test', label: 'Last Test' },
          { key: 'tests', label: 'Tests', align: 'right' },
          { key: 'reports', label: 'Reports', align: 'right' },
          { key: 'activity', label: 'Status', render: (r) => <StatusBadge variant={r.activity === 'active' ? 'success' : r.activity === 'idle' ? 'warning' : 'muted'}>{r.activity}</StatusBadge> },
        ]}
      />
    </>
  );
};
