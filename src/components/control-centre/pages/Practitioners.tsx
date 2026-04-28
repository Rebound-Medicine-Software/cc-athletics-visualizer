import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { TrendLine } from '../primitives/Charts';
import { AlertPanel, AlertItem } from '../primitives/AlertPanel';
import { Users, UserCheck, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const formatLastLogin = (iso: string | null): string => {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

export const Practitioners: React.FC = () => {
  const { data: overview } = useQuery({
    queryKey: ['practitioners-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_practitioners_overview');
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60000,
  });

  const { data: rows = [] } = useQuery({
    queryKey: ['practitioners-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_practitioners_overview');
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
  });

  const { data: trendData = [] } = useQuery({
    queryKey: ['practitioner-engagement-trends'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_practitioner_engagement_trends', { days_back: 84 });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 300000,
  });

  // Aggregate the daily series into weekly buckets for the 12-week chart
  const trend = React.useMemo(() => {
    if (!trendData.length) return [];
    const weeks: { name: string; active: number; engagement: number }[] = [];
    for (let i = 0; i < trendData.length; i += 7) {
      const slice = trendData.slice(i, i + 7);
      const active = slice.reduce((s, d) => s + Number(d.active_count || 0), 0);
      const engVals = slice.map((d) => Number(d.avg_engagement || 0)).filter((v) => v > 0);
      const engagement = engVals.length ? engVals.reduce((s, v) => s + v, 0) / engVals.length : 0;
      weeks.push({ name: `W${weeks.length + 1}`, active, engagement: Math.round(engagement) });
    }
    return weeks;
  }, [trendData]);

  const lowEng: AlertItem[] = React.useMemo(() => {
    return rows
      .filter((r) => r.engagement === 'low' || (!r.last_login_at && r.setup_completed === false))
      .slice(0, 6)
      .map((r) => ({
        id: r.user_id,
        title: `${r.full_name || r.email} — ${r.last_login_at ? `last login ${formatLastLogin(r.last_login_at)} ago` : 'never logged in'}`,
        detail: `${r.organisation_name || 'No org'} • ${r.role}`,
        severity: r.setup_completed === false ? 'info' : 'warning',
        icon: r.setup_completed === false ? Mail : AlertTriangle,
      }));
  }, [rows]);

  return (
    <>
      <PageHeader title="Users & Practitioners" subtitle="Global registry of all practitioners and team owners." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Users" value={overview?.total_practitioners ?? '—'} icon={Users} accent="navy" />
        <KpiCard label="Active 7d" value={overview?.active_7d ?? '—'} icon={UserCheck} accent="success" />
        <KpiCard label="Pending Setup" value={overview?.pending_setup ?? '—'} icon={Mail} accent="warning" />
        <KpiCard label="Inactive 30d" value={overview?.inactive_practitioners ?? '—'} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <div className="cc-glass p-4 xl:col-span-2">
          <h3 className="cc-h2 mb-1">Practitioner Activity (12 weeks)</h3>
          <p className="cc-subtle mb-2">Active logins vs. avg engagement score</p>
          <TrendLine data={trend} dataKey="active" dataKey2="engagement" color="hsl(var(--cc-gold))" color2="hsl(var(--cc-navy-glow))" />
        </div>
        <AlertPanel title="Low Engagement Watchlist" alerts={lowEng} />
      </div>

      <DataTable
        rows={rows.map((r) => ({
          ...r,
          last_login: formatLastLogin(r.last_login_at),
          credential: r.setup_completed ? 'verified' : 'pending',
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
          { key: 'organisation_name', label: 'Org', render: (r) => <span className="text-[12px]">{r.organisation_name || '—'}</span> },
          { key: 'credential', label: 'Status', render: (r) => <StatusBadge variant={r.credential === 'verified' ? 'success' : 'warning'} dot>{r.credential}</StatusBadge> },
          { key: 'last_login', label: 'Last Login' },
          { key: 'caseload', label: 'Caseload', align: 'right' },
          { key: 'reports_sent', label: 'Reports', align: 'right' },
          { key: 'engagement', label: 'Engagement', render: (r) => <StatusBadge variant={r.engagement === 'high' ? 'success' : r.engagement === 'med' ? 'warning' : r.engagement === 'low' ? 'danger' : 'info'}>{r.engagement}</StatusBadge> },
        ]}
      />
    </>
  );
};
