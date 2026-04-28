import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { StatusBadge } from '../primitives/StatusBadge';
import { Activity, Zap, AlertTriangle, Users, Building2, FlaskConical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Overview = {
  tests_today: number;
  tests_this_month: number;
  unique_athletes_today: number;
  active_orgs_today: number;
  failed_uploads_24h: number;
  counts_by_test_type: { test_type: string; count: number }[];
};
type RecentRow = {
  id: string; athlete_name: string | null; team_name: string | null;
  test_name: string | null; test_type: string | null;
  key_metric_label: string; key_metric_value: number | null;
  created_at: string; athlete_id: string | null;
};
type AnomalyRow = {
  id: string; athlete_name: string | null; team_name: string | null; test_name: string | null;
  anomaly_type: string; severity: 'critical' | 'warning'; detail: string; created_at: string;
};

export const LiveMonitor: React.FC = () => {
  const { data: overview } = useQuery({
    queryKey: ['cc-live-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_live_testing_overview');
      if (error) throw error;
      return data as unknown as Overview;
    },
    refetchInterval: 30_000,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['cc-live-recent'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_recent_tests_global', { row_limit: 50 });
      if (error) throw error;
      return (data || []) as RecentRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: anomalies = [] } = useQuery({
    queryKey: ['cc-live-anomalies'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_testing_anomalies', { row_limit: 30 });
      if (error) throw error;
      return (data || []) as AnomalyRow[];
    },
    refetchInterval: 60_000,
  });

  const typeCounts = overview?.counts_by_test_type ?? [];
  const topTypes = typeCounts.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Live Testing Data Monitor"
        subtitle="Real-time force plate intake across all organisations."
        actions={<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--cc-success) / 0.1)', border: '1px solid hsl(var(--cc-success) / 0.3)' }}>
          <span className="cc-pulse" />
          <span className="text-[12px] font-semibold" style={{ color: 'hsl(var(--cc-success))' }}>Live • polling 30s</span>
        </div>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Tests Today" value={overview?.tests_today ?? '—'} icon={FlaskConical} accent="navy" />
        <KpiCard label="Tests MTD" value={overview?.tests_this_month ?? '—'} icon={Activity} accent="info" />
        <KpiCard label="Athletes Today" value={overview?.unique_athletes_today ?? '—'} icon={Users} accent="success" />
        <KpiCard label="Active Orgs Today" value={overview?.active_orgs_today ?? '—'} icon={Building2} accent="gold" />
        <KpiCard label="Failed Uploads 24h" value={overview?.failed_uploads_24h ?? '—'} icon={AlertTriangle} accent="danger" />
        <KpiCard label="Anomalies (14d)" value={anomalies.length} icon={Zap} accent="warning" />
      </div>

      {topTypes.length > 0 && (
        <div className="cc-glass p-3 mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-[12px] font-semibold mr-1" style={{ color: 'hsl(var(--cc-fg-muted))' }}>Today by test type:</span>
          {topTypes.map((t) => (
            <StatusBadge key={t.test_type} variant="info">{t.test_type} · {t.count}</StatusBadge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cc-glass p-4 lg:col-span-2">
          <h3 className="cc-h2 mb-3">Live Test Feed</h3>
          <div className="space-y-1.5 max-h-[560px] overflow-auto">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
                <span className="cc-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{t.athlete_name || '—'}</div>
                  <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{t.team_name || '—'}</div>
                </div>
                <StatusBadge variant="info">{t.test_name || t.test_type || '—'}</StatusBadge>
                {t.key_metric_value != null && (
                  <span className="text-[11px] font-mono" style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                    {t.key_metric_label}: {t.key_metric_value}
                  </span>
                )}
                <span className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                  {new Date(t.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {recent.length === 0 && <p className="cc-subtle text-center py-8">Waiting for incoming tests…</p>}
          </div>
        </div>

        <div className="cc-glass p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: 'hsl(var(--cc-warning))' }} />
            <h3 className="cc-h2">Anomaly Detection</h3>
          </div>
          <p className="cc-subtle mb-3">Outliers, missing linkage & duplicates flagged in last 14 days.</p>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {anomalies.map((a) => (
              <div key={a.id + a.anomaly_type} className="p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold truncate">{a.athlete_name || '—'}</span>
                  <StatusBadge variant={a.severity === 'critical' ? 'danger' : 'warning'}>{a.severity}</StatusBadge>
                </div>
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{a.anomaly_type}</div>
                <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.detail}</div>
                <div className="text-[11px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.team_name || '—'} · {new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
            {anomalies.length === 0 && <p className="cc-subtle text-center py-6 text-xs">No anomalies detected.</p>}
          </div>
        </div>
      </div>
    </>
  );
};
