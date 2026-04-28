import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { OrganisationDetailDrawer } from '../primitives/OrganisationDetailDrawer';
import { ImpersonationModal } from '../primitives/ImpersonationModal';
import { Building2, DollarSign, Users, AlertTriangle, Eye, UserCog, ArrowUpCircle, Pause, MessageSquare, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrgRow {
  id: string;
  name: string;
  cc_team_id: string | null;
  country: string | null;
  primary_color: string | null;
  subscription_status: string | null;
  organisation_status: string | null;
  tier_name: string | null;
  owner_email: string | null;
  owner_full_name: string | null;
  practitioner_count: number;
  athlete_count: number;
  tests_this_month: number;
  monthly_revenue: number;
  last_activity_at: string | null;
  created_at: string | null;
  churn_risk_score: number;
  cc_athletics_status: 'ok' | 'down' | 'off';
  calcom_status: 'ok' | 'down' | 'off';
  notificationapi_status: 'ok' | 'down' | 'off';
}

interface OrgKpis {
  total: number;
  trial: number;
  paying: number;
  suspended: number;
  mrr: number;
}

const fmtCurrency = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}k`
  : `$${Math.round(n)}`;

const relTime = (iso: string | null) => {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
};

const churnBucket = (score: number): 'low' | 'med' | 'high' => {
  if (score >= 60) return 'high';
  if (score >= 30) return 'med';
  return 'low';
};

const integrationBadge = (s: 'ok' | 'down' | 'off') => (
  <StatusBadge variant={s === 'ok' ? 'success' : s === 'down' ? 'danger' : 'muted'} dot>{s}</StatusBadge>
);

export const Organisations: React.FC = () => {
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [kpis, setKpis] = useState<OrgKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [listRes, kpiRes] = await Promise.all([
          (supabase as any).rpc('list_organisations_overview'),
          (supabase as any).rpc('get_organisations_kpis'),
        ]);
        if (!alive) return;
        if (listRes.error) console.error('list_organisations_overview failed', listRes.error);
        if (kpiRes.error) console.error('get_organisations_kpis failed', kpiRes.error);
        setRows((listRes.data as OrgRow[]) || []);
        setKpis((kpiRes.data as OrgKpis) || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const action = (label: string, name: string) =>
    () => toast(`${label} → ${name}`, { description: 'Coming next — not yet wired.' });

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
        <KpiCard label="Total Orgs" value={loading ? '—' : (kpis?.total ?? 0)} icon={Building2} accent="navy" />
        <KpiCard label="Trial Accounts" value={loading ? '—' : (kpis?.trial ?? 0)} icon={Users} accent="info" />
        <KpiCard label="Paying Accounts" value={loading ? '—' : (kpis?.paying ?? 0)} icon={DollarSign} accent="success" />
        <KpiCard label="Suspended" value={loading ? '—' : (kpis?.suspended ?? 0)} icon={AlertTriangle} accent="danger" />
        <KpiCard label="MRR" value={loading ? '—' : fmtCurrency(kpis?.mrr ?? 0)} icon={DollarSign} accent="gold" />
      </div>

      <DataTable
        rows={rows}
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
                  <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{r.country || '—'}</div>
                </div>
              </div>
            ),
          },
          { key: 'cc_team_id', label: 'Team ID', render: (r) => <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.cc_team_id ? `${r.cc_team_id.slice(0, 10)}…` : '—'}</code> },
          { key: 'owner_email', label: 'Owner', render: (r) => r.owner_full_name || r.owner_email || '—' },
          {
            key: 'tier_name', label: 'Tier',
            render: (r) => r.tier_name
              ? <StatusBadge variant={r.tier_name === 'Elite' ? 'gold' : r.tier_name === 'Premium' ? 'info' : 'muted'}>{r.tier_name}</StatusBadge>
              : <StatusBadge variant="muted">—</StatusBadge>,
          },
          {
            key: 'subscription_status', label: 'Status',
            render: (r) => <StatusBadge variant={
              r.subscription_status === 'active' ? 'success'
              : r.subscription_status === 'trial' ? 'info'
              : r.subscription_status === 'suspended' || r.subscription_status === 'past_due' ? 'danger'
              : 'muted'
            }>{r.subscription_status || '—'}</StatusBadge>,
          },
          { key: 'practitioner_count', label: 'Pract.', align: 'right' },
          { key: 'athlete_count', label: 'Athletes', align: 'right' },
          { key: 'tests_this_month', label: 'Tests/mo', align: 'right' },
          { key: 'monthly_revenue', label: 'Rev/mo', align: 'right', render: (r) => fmtCurrency(Number(r.monthly_revenue) || 0) },
          { key: 'last_activity_at', label: 'Last Active', render: (r) => relTime(r.last_activity_at) },
          { key: 'cc_athletics_status', label: 'CC API', render: (r) => integrationBadge(r.cc_athletics_status) },
          { key: 'calcom_status', label: 'Cal.com', render: (r) => integrationBadge(r.calcom_status) },
          { key: 'notificationapi_status', label: 'Notif', render: (r) => integrationBadge(r.notificationapi_status) },
          {
            key: 'churn_risk_score', label: 'Churn Risk',
            render: (r) => {
              const b = churnBucket(Number(r.churn_risk_score) || 0);
              return <StatusBadge variant={b === 'high' ? 'danger' : b === 'med' ? 'warning' : 'success'}>{b}</StatusBadge>;
            },
          },
          {
            key: 'actions', label: '', align: 'right',
            render: (r) => (
              <div className="flex items-center gap-1 justify-end">
                {[
                  { Icon: Eye, label: 'View', onClick: () => setOpenTeamId(r.id) },
                  { Icon: UserCog, label: 'Impersonate', onClick: () => setImpersonateTarget({ id: r.id, name: r.name }) },
                  { Icon: ArrowUpCircle, label: 'Upgrade', onClick: action('Upgrade', r.name) },
                  { Icon: Pause, label: 'Suspend', onClick: action('Suspend', r.name) },
                  { Icon: MessageSquare, label: 'Message', onClick: action('Message', r.name) },
                  { Icon: History, label: 'Audit', onClick: action('Audit', r.name) },
                ].map(({ Icon, label, onClick }) => (
                  <button key={label} title={label} className="cc-btn p-1.5" onClick={onClick}>
                    <Icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            ),
          },
        ]}
        empty={loading ? 'Loading organisations…' : 'No organisations yet'}
        maxHeight={620}
      />

      <OrganisationDetailDrawer teamId={openTeamId} onClose={() => setOpenTeamId(null)} />
      <ImpersonationModal
        open={!!impersonateTarget}
        onClose={() => setImpersonateTarget(null)}
        teamId={impersonateTarget?.id ?? null}
        teamName={impersonateTarget?.name ?? null}
      />
    </>
  );
};
