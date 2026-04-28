import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendLine } from '../primitives/Charts';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { FileText, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FAILURE_TYPES = new Set([
  'report_generation_failed',
  'report_email_failed',
  'ai_coach_insight_failed',
]);

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function eventLabel(evt: string): { label: string; variant: 'success' | 'danger' | 'gold' | 'info' | 'warning' } {
  switch (evt) {
    case 'report_generated': return { label: 'PDF Report', variant: 'info' };
    case 'report_generation_failed': return { label: 'Report Failed', variant: 'danger' };
    case 'report_email_sent': return { label: 'Email Sent', variant: 'success' };
    case 'report_email_failed': return { label: 'Email Failed', variant: 'danger' };
    case 'ai_coach_insight_generated': return { label: 'AI Insight', variant: 'gold' };
    case 'ai_coach_insight_failed': return { label: 'AI Failed', variant: 'danger' };
    default: return { label: evt, variant: 'info' };
  }
}

export const Reports: React.FC = () => {
  const overviewQ = useQuery({
    queryKey: ['cc-reports-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_reports_ai_overview');
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60000,
  });

  const trendsQ = useQuery({
    queryKey: ['cc-reports-trends', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_reports_ai_trends', { days_back: 30 });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    refetchInterval: 60000,
  });

  const activityQ = useQuery({
    queryKey: ['cc-reports-activity'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_reports_ai_activity', { row_limit: 100 });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    refetchInterval: 30000,
  });

  const o = overviewQ.data ?? {};
  const totalFailures =
    Number(o.failed_report_jobs_24h ?? 0) +
    Number(o.failed_report_emails_24h ?? 0) +
    Number(o.failed_ai_insights_24h ?? 0);
  const avgMs = o.avg_report_duration_ms ? Number(o.avg_report_duration_ms) : null;
  const avgDisplay = avgMs ? `${(avgMs / 1000).toFixed(1)}s` : '—';

  const trendData = (trendsQ.data ?? []).map((r: any) => ({
    name: new Date(r.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    reports: Number(r.reports_generated ?? 0),
    ai: Number(r.ai_insights ?? 0),
  }));

  const rows = (activityQ.data ?? []).map((r: any) => {
    const meta = r.metadata ?? {};
    const dMs = meta.duration_ms ? Number(meta.duration_ms) : null;
    return {
      id: r.id,
      shortId: String(r.id).slice(0, 8),
      org: r.organisation_name ?? '—',
      eventType: r.event_type,
      duration: dMs ? `${(dMs / 1000).toFixed(1)}s` : '—',
      severity: r.severity,
      isFailure: FAILURE_TYPES.has(r.event_type),
      created: formatRelative(r.created_at),
    };
  });

  return (
    <>
      <PageHeader title="Reports & AI Engine" subtitle="PDF generation, AI Coach insights & delivery health." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard
          label="Reports Generated (MTD)"
          value={overviewQ.isLoading ? '…' : Number(o.reports_generated_month ?? 0).toLocaleString()}
          icon={FileText}
          accent="navy"
        />
        <KpiCard
          label="AI Coach Insights (MTD)"
          value={overviewQ.isLoading ? '…' : Number(o.ai_insights_month ?? 0).toLocaleString()}
          icon={Sparkles}
          accent="gold"
        />
        <KpiCard
          label="Avg Generation Time"
          value={overviewQ.isLoading ? '…' : avgDisplay}
          icon={Clock}
          accent="success"
        />
        <KpiCard
          label="Failures (24h)"
          value={overviewQ.isLoading ? '…' : totalFailures}
          icon={AlertTriangle}
          accent="danger"
        />
      </div>

      <div className="cc-glass p-4 mb-5">
        <h3 className="cc-h2 mb-1">Processing Trend</h3>
        <p className="cc-subtle mb-2">PDF reports vs AI insights (last 30 days)</p>
        {trendsQ.isLoading ? (
          <div className="cc-subtle text-sm py-8 text-center">Loading…</div>
        ) : trendData.length === 0 ? (
          <div className="cc-subtle text-sm py-8 text-center">No activity yet.</div>
        ) : (
          <TrendLine
            data={trendData}
            dataKey="reports"
            dataKey2="ai"
            color="hsl(var(--cc-navy-glow))"
            color2="hsl(var(--cc-gold))"
          />
        )}
      </div>

      {(o.top_organisations?.length ?? 0) > 0 && (
        <div className="cc-glass p-4 mb-5">
          <h3 className="cc-h2 mb-1">Top Organisations by Reports (MTD)</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
            {(o.top_organisations as any[]).map((org) => (
              <div key={org.team_id ?? org.organisation_name} className="rounded-md border border-[hsl(var(--cc-border))] p-2">
                <div className="text-[12px] truncate" style={{ color: 'hsl(var(--cc-fg))' }}>{org.organisation_name}</div>
                <div className="text-[18px] font-semibold" style={{ color: 'hsl(var(--cc-gold))' }}>{org.reports_generated}</div>
                <div className="cc-subtle text-[10.5px]">reports</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        rows={rows}
        columns={[
          { key: 'shortId', label: 'Event ID', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.shortId}</code> },
          { key: 'org', label: 'Organisation' },
          { key: 'eventType', label: 'Event', render: (r: any) => {
            const { label, variant } = eventLabel(r.eventType);
            return <StatusBadge variant={variant}>{label}</StatusBadge>;
          } },
          { key: 'duration', label: 'Duration', align: 'right' },
          { key: 'severity', label: 'Severity', render: (r: any) => (
            <StatusBadge
              variant={r.severity === 'critical' ? 'danger' : r.severity === 'warning' ? 'warning' : r.isFailure ? 'danger' : 'success'}
              dot
            >
              {r.severity}
            </StatusBadge>
          ) },
          { key: 'created', label: 'When', align: 'right' },
        ]}
      />
      {activityQ.isSuccess && rows.length === 0 && (
        <div className="cc-subtle text-sm py-6 text-center">No report or AI activity yet.</div>
      )}
    </>
  );
};
