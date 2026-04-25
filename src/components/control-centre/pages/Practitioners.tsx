import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { TrendLine } from '../primitives/Charts';
import { AlertPanel, AlertItem } from '../primitives/AlertPanel';
import { Users, UserCheck, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const trend = Array.from({ length: 12 }, (_, i) => ({ name: `W${i + 1}`, active: 60 + i * 2 + Math.sin(i) * 4, invited: 40 + i * 1.5 }));
const lowEng: AlertItem[] = [
  { id: '1', title: 'Dr. R. Hayes — 0 logins in 21 days', detail: 'Velocity Lab • Practitioner', severity: 'warning', icon: AlertTriangle },
  { id: '2', title: 'C. Patel — invite expired', detail: 'Stride Labs • sent 14d ago', severity: 'info', icon: Mail },
  { id: '3', title: 'M. Bauer — 1 report in 30d', detail: 'Apex Performance', severity: 'warning', icon: AlertTriangle },
];

export const Practitioners: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id,full_name,email,role,team_id,created_at,setup_completed').in('role', ['practitioner', 'organisation']).limit(200)
      .then(({ data }) => setRows(data || []));
  }, []);

  return (
    <>
      <PageHeader title="Users & Practitioners" subtitle="Global registry of all practitioners and team owners." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Users" value={rows.length || '—'} icon={Users} accent="navy" />
        <KpiCard label="Active 7d" value={Math.floor(rows.length * 0.62)} delta={3.2} icon={UserCheck} accent="success" />
        <KpiCard label="Pending Invites" value={Math.floor(rows.length * 0.14)} icon={Mail} accent="warning" />
        <KpiCard label="Low Engagement" value={Math.floor(rows.length * 0.09)} delta={-1.4} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="cc-glass p-4 xl:col-span-2">
          <h3 className="cc-h2 mb-1">Practitioner Activity (12 weeks)</h3>
          <p className="cc-subtle mb-2">Active vs invited cohort</p>
          <TrendLine data={trend} dataKey="active" dataKey2="invited" color="hsl(var(--cc-gold))" color2="hsl(var(--cc-navy-glow))" />
        </div>
        <AlertPanel title="Low Engagement Watchlist" alerts={lowEng} />
      </div>

      <DataTable<any>
        rows={rows.map((r, i) => ({
          ...r,
          last_login: ['2h', '4d', '11h', '21d', '3d'][i % 5],
          credential: r.setup_completed ? 'verified' : 'pending',
          caseload: 6 + (i * 3) % 30,
          reports: 2 + (i * 5) % 40,
          engagement: ['high', 'med', 'low'][i % 3],
        }))}
        columns={[
          { key: 'full_name', label: 'Name', render: (r) => (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[11px]"
                   style={{ background: 'var(--cc-grad-primary)', color: 'white' }}>
                {(r.full_name || r.email || '?').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-[13px]">{r.full_name || '—'}</div>
                <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{r.email}</div>
              </div>
            </div>
          )},
          { key: 'role', label: 'Role', render: (r) => <StatusBadge variant={r.role === 'organisation' ? 'gold' : 'info'}>{r.role}</StatusBadge> },
          { key: 'team_id', label: 'Org', render: (r) => <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.team_id?.slice(0, 8) || '—'}</code> },
          { key: 'credential', label: 'Status', render: (r) => <StatusBadge variant={r.credential === 'verified' ? 'success' : 'warning'} dot>{r.credential}</StatusBadge> },
          { key: 'last_login', label: 'Last Login' },
          { key: 'caseload', label: 'Caseload', align: 'right' },
          { key: 'reports', label: 'Reports', align: 'right' },
          { key: 'engagement', label: 'Engagement', render: (r) => <StatusBadge variant={r.engagement === 'high' ? 'success' : r.engagement === 'med' ? 'warning' : 'danger'}>{r.engagement}</StatusBadge> },
        ]}
      />
    </>
  );
};
