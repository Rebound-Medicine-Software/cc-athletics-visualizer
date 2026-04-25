import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { Building2, DollarSign, Users, AlertTriangle, Eye, UserCog, ArrowUpCircle, Pause, MessageSquare, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrgRow {
  id: string;
  name: string;
  cc_team_id: string;
  country: string | null;
  practitioner_count: number | null;
  created_at: string | null;
  primary_color?: string | null;
}

const tiers = ['Basic', 'Premium', 'Elite'];
const churnLabel = (i: number) => (i % 7 === 0 ? 'high' : i % 4 === 0 ? 'med' : 'low');

export const Organisations: React.FC = () => {
  const [rows, setRows] = useState<OrgRow[]>([]);

  useEffect(() => {
    supabase.from('teams').select('id,name,cc_team_id,country,practitioner_count,created_at,primary_color').limit(200)
      .then(({ data }) => setRows(data || []));
  }, []);

  const action = (label: string, name: string) => () => toast(`${label} → ${name}`, { description: 'Visual-only in this build.' });

  return (
    <>
      <PageHeader
        title="Organisations"
        subtitle="All tenant clinics, teams and labs across the platform."
        actions={
          <>
            <button className="cc-btn">Filters</button>
            <button className="cc-btn cc-btn-gold">+ New Organisation</button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Total Orgs" value={rows.length || '—'} icon={Building2} accent="navy" />
        <KpiCard label="Trial Accounts" value={Math.max(1, Math.floor(rows.length * 0.18))} icon={Users} accent="info" />
        <KpiCard label="Paying Accounts" value={Math.max(1, Math.floor(rows.length * 0.74))} icon={DollarSign} accent="success" />
        <KpiCard label="Suspended" value={Math.max(0, Math.floor(rows.length * 0.04))} icon={AlertTriangle} accent="danger" />
        <KpiCard label="MRR" value="$61.2k" delta={10.5} icon={DollarSign} accent="gold" />
      </div>

      <DataTable<any>
        rows={rows.map((r, i) => ({
          ...r,
          tier: tiers[i % 3],
          owner: `owner-${i + 1}@org.io`,
          athletes: 18 + ((i * 7) % 90),
          tests: 120 + ((i * 13) % 600),
          revenue: 199 + ((i * 47) % 4000),
          last_active: ['2h', '14m', '1d', '3d', '6h'][i % 5],
          cc: i % 5 === 0 ? 'down' : 'ok',
          cal: i % 7 === 0 ? 'down' : 'ok',
          notif: i % 11 === 0 ? 'down' : 'ok',
          churn: churnLabel(i),
        }))}
        columns={[
          {
            key: 'name', label: 'Organisation',
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-[11px]"
                     style={{ background: `${r.primary_color || '#1e3a6e'}33`, color: r.primary_color || '#5b8def', border: `1px solid ${r.primary_color || '#1e3a6e'}66` }}>
                  {r.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-[13px]">{r.name}</div>
                  <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{r.country || 'UK'}</div>
                </div>
              </div>
            ),
          },
          { key: 'cc_team_id', label: 'Team ID', render: (r) => <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.cc_team_id?.slice(0, 10)}…</code> },
          { key: 'owner', label: 'Owner' },
          { key: 'tier', label: 'Tier', render: (r) => <StatusBadge variant={r.tier === 'Elite' ? 'gold' : r.tier === 'Premium' ? 'info' : 'muted'}>{r.tier}</StatusBadge> },
          { key: 'practitioner_count', label: 'Pract.', align: 'right' },
          { key: 'athletes', label: 'Athletes', align: 'right' },
          { key: 'tests', label: 'Tests/mo', align: 'right' },
          { key: 'revenue', label: 'Rev/mo', align: 'right', render: (r) => `$${r.revenue}` },
          { key: 'last_active', label: 'Last Active' },
          { key: 'cc', label: 'CC API', render: (r) => <StatusBadge variant={r.cc === 'ok' ? 'success' : 'danger'} dot>{r.cc}</StatusBadge> },
          { key: 'cal', label: 'Cal.com', render: (r) => <StatusBadge variant={r.cal === 'ok' ? 'success' : 'danger'} dot>{r.cal}</StatusBadge> },
          { key: 'notif', label: 'Notif', render: (r) => <StatusBadge variant={r.notif === 'ok' ? 'success' : 'danger'} dot>{r.notif}</StatusBadge> },
          { key: 'churn', label: 'Churn Risk', render: (r) => <StatusBadge variant={r.churn === 'high' ? 'danger' : r.churn === 'med' ? 'warning' : 'success'}>{r.churn}</StatusBadge> },
          {
            key: 'actions', label: '', align: 'right',
            render: (r) => (
              <div className="flex items-center gap-1 justify-end">
                {[
                  { Icon: Eye, label: 'View' },
                  { Icon: UserCog, label: 'Impersonate' },
                  { Icon: ArrowUpCircle, label: 'Upgrade' },
                  { Icon: Pause, label: 'Suspend' },
                  { Icon: MessageSquare, label: 'Message' },
                  { Icon: History, label: 'Audit' },
                ].map(({ Icon, label }) => (
                  <button key={label} title={label} className="cc-btn p-1.5" onClick={action(label, r.name)}>
                    <Icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            ),
          },
        ]}
        empty="No organisations yet"
        maxHeight={620}
      />
    </>
  );
};
