import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { TrendBars } from '../primitives/Charts';
import { Users, CheckCircle2, ClipboardList, Activity, FileText, CalendarCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Overview = {
  total_athletes: number;
  active_30d: number;
  inactive_athletes: number;
  consent_signed: number;
  consent_pending: number;
  consent_completion_rate: number;
  reports_sent_total: number;
  tested_this_month: number;
  age_distribution: { name: string; value: number }[];
};

type AthleteRow = {
  id: string;
  name: string;
  email: string | null;
  team_id: string | null;
  organisation_name: string | null;
  practitioner_name: string | null;
  practitioner_email: string | null;
  consent_status: string;
  last_test_at: string | null;
  tests_logged: number;
  reports_sent: number;
  activity_status: string;
  age: number | null;
  gender: string | null;
};

const fmtAgo = (iso: string | null) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d <= 0) {
    const h = Math.floor(ms / 3600000);
    return `${Math.max(h, 0)}h`;
  }
  if (d < 14) return `${d}d`;
  if (d < 60) return `${Math.floor(d / 7)}w`;
  return `${Math.floor(d / 30)}mo`;
};

export const Athletes: React.FC = () => {
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterConsent, setFilterConsent] = useState<string>('');
  const [filterActivity, setFilterActivity] = useState<string>('');
  const [testedMonth, setTestedMonth] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data: overview } = useQuery({
    queryKey: ['cc-athletes-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_athletes_overview');
      if (error) throw error;
      return data as unknown as Overview;
    },
    refetchInterval: 60_000,
  });

  const { data: rows = [] } = useQuery({
    queryKey: ['cc-athletes-list', filterTeam, filterConsent, filterActivity, testedMonth, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_athletes_global', {
        filter_team_id: filterTeam || null,
        filter_consent: filterConsent || null,
        filter_activity: filterActivity || null,
        tested_this_month: testedMonth === '' ? null : testedMonth === 'yes',
        search_text: search || null,
        row_limit: 500,
      });
      if (error) throw error;
      return (data || []) as AthleteRow[];
    },
    refetchInterval: 60_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['cc-athletes-teams'],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('id,name').order('name');
      return data || [];
    },
  });

  const ageData = useMemo(() => overview?.age_distribution ?? [], [overview]);

  return (
    <>
      <PageHeader title="Athletes Global Registry" subtitle="Cross-tenant view of every athlete and consent state." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Total Athletes" value={overview?.total_athletes ?? '—'} icon={Users} accent="navy" />
        <KpiCard label="Active 30d" value={overview?.active_30d ?? '—'} icon={Activity} accent="info" />
        <KpiCard label="Inactive" value={overview?.inactive_athletes ?? '—'} icon={Users} accent="muted" />
        <KpiCard label="Consent %" value={overview ? `${overview.consent_completion_rate}%` : '—'} icon={CheckCircle2} accent="success" />
        <KpiCard label="Reports Sent" value={overview?.reports_sent_total ?? '—'} icon={FileText} accent="navy" />
        <KpiCard label="Tested MTD" value={overview?.tested_this_month ?? '—'} icon={CalendarCheck} accent="warning" />
      </div>

      <div className="cc-glass p-4 mb-5">
        <h3 className="cc-h2 mb-1">Age Group Distribution</h3>
        <p className="cc-subtle mb-2">All registered athletes</p>
        <TrendBars data={ageData} dataKey="value" highlightIndex={2} />
      </div>

      <div className="cc-glass p-3 mb-3 flex flex-wrap gap-2 items-center">
        <input
          placeholder="Search name / email / org…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cc-input text-sm px-2 py-1 rounded border bg-transparent"
          style={{ borderColor: 'hsl(var(--cc-border))', minWidth: 200 }}
        />
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="text-sm px-2 py-1 rounded border bg-transparent" style={{ borderColor: 'hsl(var(--cc-border))' }}>
          <option value="">All organisations</option>
          {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterConsent} onChange={(e) => setFilterConsent(e.target.value)} className="text-sm px-2 py-1 rounded border bg-transparent" style={{ borderColor: 'hsl(var(--cc-border))' }}>
          <option value="">Any consent</option>
          <option value="signed">Signed</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="text-sm px-2 py-1 rounded border bg-transparent" style={{ borderColor: 'hsl(var(--cc-border))' }}>
          <option value="">Any activity</option>
          <option value="active">Active (≤30d)</option>
          <option value="idle">Idle (≤90d)</option>
          <option value="dormant">Dormant</option>
        </select>
        <select value={testedMonth} onChange={(e) => setTestedMonth(e.target.value)} className="text-sm px-2 py-1 rounded border bg-transparent" style={{ borderColor: 'hsl(var(--cc-border))' }}>
          <option value="">Tested this month?</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <span className="cc-subtle text-xs ml-auto">{rows.length} shown</span>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: 'name', label: 'Athlete' },
          { key: 'organisation_name', label: 'Organisation', render: (r) => r.organisation_name || '—' },
          { key: 'practitioner_name', label: 'Practitioner', render: (r) => r.practitioner_name || '—' },
          { key: 'consent_status', label: 'Consent', render: (r) => <StatusBadge variant={r.consent_status === 'signed' ? 'success' : 'warning'} dot>{r.consent_status}</StatusBadge> },
          { key: 'last_test_at', label: 'Last Test', render: (r) => fmtAgo(r.last_test_at) },
          { key: 'tests_logged', label: 'Tests', align: 'right' },
          { key: 'reports_sent', label: 'Reports', align: 'right' },
          { key: 'age', label: 'Age', align: 'right', render: (r) => r.age ?? '—' },
          { key: 'gender', label: 'Sex', render: (r) => r.gender || '—' },
          { key: 'activity_status', label: 'Status', render: (r) => <StatusBadge variant={r.activity_status === 'active' ? 'success' : r.activity_status === 'idle' ? 'warning' : 'muted'}>{r.activity_status}</StatusBadge> },
        ]}
      />
    </>
  );
};
