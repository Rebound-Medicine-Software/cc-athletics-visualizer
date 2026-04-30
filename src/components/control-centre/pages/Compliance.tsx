import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { ImpersonationAuditPanel } from '../primitives/ImpersonationAuditPanel';
import { AuditEventDetailDrawer } from '../primitives/AuditEventDetailDrawer';
import { Search, RefreshCw, AlertTriangle, ShieldAlert, UserCheck, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  usePlatformActivityRealtime,
  useIntegrationHealthRealtime,
  useImpersonationRealtime,
} from '../hooks/useRealtimeChannel';
import { useCallback, useRef } from 'react';

interface AuditRow {
  event_id: string;
  source: string;
  event_type: string;
  severity: string;
  actor_id: string | null;
  actor_label: string | null;
  team_id: string | null;
  organisation_name: string | null;
  target_label: string | null;
  occurred_at: string;
  metadata: any;
}

interface Overview {
  critical_events_24h: number;
  warning_events_24h: number;
  failed_integrations_24h: number;
  active_impersonations: number;
  unresolved_alerts: number;
  impersonations_24h: number;
}

const sevVariant = (s: string) =>
  s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info';

const RANGES: Record<string, number | null> = {
  '24h': 1, '7d': 7, '30d': 30, 'all': null,
};

const relTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const Compliance: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<keyof typeof RANGES>('7d');
  const [severity, setSeverity] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [selected, setSelected] = useState<string | null>(null);

  const loadOverview = async () => {
    const { data, error } = await supabase.rpc('get_audit_overview');
    if (error) { toast.error(error.message); return; }
    setOverview(data as unknown as Overview);
  };

  const loadRows = async () => {
    setLoading(true);
    const days = RANGES[range];
    const start = days != null ? new Date(Date.now() - days * 24 * 3600 * 1000).toISOString() : null;
    const { data, error } = await supabase.rpc('list_platform_audit_events', {
      start_date: start,
      end_date: null,
      filter_severity: severity || null,
      filter_event_type: null,
      filter_team_id: null,
      filter_actor: null,
      filter_source: source || null,
      search_text: search || null,
      row_limit: 500,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data || []) as unknown as AuditRow[]);
  };

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { loadRows(); }, [range, severity, source]);

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') loadRows();
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = ['event_id','source','event_type','severity','actor','organisation','target','occurred_at'];
    const lines = [headers.join(',')].concat(rows.map(r => [
      r.event_id, r.source, r.event_type, r.severity,
      r.actor_label || '', r.organisation_name || '',
      (r.target_label || '').replace(/[\r\n,]/g, ' '),
      r.occurred_at,
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const kpis = useMemo(() => ([
    { label: 'Critical 24h',         value: overview?.critical_events_24h ?? 0, icon: ShieldAlert, color: 'hsl(var(--cc-danger))' },
    { label: 'Failed Integrations 24h', value: overview?.failed_integrations_24h ?? 0, icon: AlertTriangle, color: 'hsl(var(--cc-warning))' },
    { label: 'Active Impersonations', value: overview?.active_impersonations ?? 0, icon: UserCheck, color: 'hsl(var(--cc-navy-glow))' },
    { label: 'Unresolved Alerts',    value: overview?.unresolved_alerts ?? 0, icon: Activity, color: 'hsl(var(--cc-warning))' },
  ]), [overview]);

  return (
    <>
      <PageHeader
        title="Compliance / Audit Logs"
        subtitle="Tamper-evident log of every privileged platform action."
        actions={
          <button className="cc-btn" onClick={() => { loadOverview(); loadRows(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="cc-glass p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10.5px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{k.label}</div>
                <Icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div className="text-[24px] font-bold mt-2" style={{ color: k.color }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      <ImpersonationAuditPanel />

      {/* Filter bar */}
      <div className="cc-glass p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--cc-fg-dim))' }} />
          <input
            className="cc-input pl-9"
            placeholder="Search actor, organisation, event… (Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
          />
        </div>
        <select className="cc-input max-w-[160px]" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select className="cc-input max-w-[180px]" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          <option value="platform_activity">Platform activity</option>
          <option value="impersonation">Impersonation</option>
          <option value="integration_failure">Integration failure</option>
        </select>
        <select className="cc-input max-w-[140px]" value={range} onChange={(e) => setRange(e.target.value as any)}>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
        <button className="cc-btn cc-btn-primary" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
      </div>

      <DataTable
        rows={rows}
        onRowClick={(r: any) => setSelected(r.event_id)}
        columns={[
          { key: 'occurred_at', label: 'When', render: (r: any) => <span title={new Date(r.occurred_at).toLocaleString()}>{relTime(r.occurred_at)}</span> },
          { key: 'severity', label: 'Severity', render: (r: any) => <StatusBadge variant={sevVariant(r.severity) as any} dot>{r.severity}</StatusBadge> },
          { key: 'source', label: 'Source', render: (r: any) => <code className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.source}</code> },
          { key: 'event_type', label: 'Event' },
          { key: 'actor_label', label: 'Actor', render: (r: any) => r.actor_label || '—' },
          { key: 'organisation_name', label: 'Organisation', render: (r: any) => r.organisation_name || '—' },
          { key: 'target_label', label: 'Detail', render: (r: any) => <span className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.target_label || '—'}</span> },
        ] as any}
        maxHeight={600}
      />

      <AuditEventDetailDrawer eventId={selected} onClose={() => setSelected(null)} />
    </>
  );
};
