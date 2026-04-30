import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { StatusBadge } from '../primitives/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity, AlertTriangle, CheckCircle2, ClipboardCheck, Clock,
  RefreshCw, Webhook, UserCheck, Bell,
} from 'lucide-react';

interface HealthSnapshot {
  latest_org_health_snapshot_at: string | null;
  latest_platform_alert_at: string | null;
  latest_impersonation_cleanup_at: string | null;
  recent_integration_failures_24h: number;
  active_webhook_endpoints: number;
  total_webhook_endpoints: number;
  active_impersonations: number;
  unresolved_alerts: number;
  generated_at: string;
}

const fmt = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString() : '—';

const ageHours = (iso: string | null | undefined) => {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 36e5;
};

const FreshnessBadge: React.FC<{ iso: string | null | undefined; warnHours: number; errorHours: number }> = ({ iso, warnHours, errorHours }) => {
  const h = ageHours(iso);
  if (!iso) return <StatusBadge variant="danger" dot>never</StatusBadge>;
  if (h > errorHours) return <StatusBadge variant="danger" dot>stale</StatusBadge>;
  if (h > warnHours) return <StatusBadge variant="warning" dot>aging</StatusBadge>;
  return <StatusBadge variant="success" dot>fresh</StatusBadge>;
};

const Card: React.FC<{ icon: React.ComponentType<any>; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="cc-glass p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color: 'hsl(var(--cc-fg-dim))' }} />
      <h3 className="text-[12px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{title}</h3>
    </div>
    {children}
  </div>
);

const UAT_STEPS = [
  'View-As: impersonate one organisation, verify reads scope to that org and writes are blocked, then end impersonation and confirm an entry in Compliance.',
  'Email campaign: send a test announcement to a single test organisation owner via Notifications Centre.',
  'In-App campaign: send the same to that org owner and verify it appears in the dashboard bell inbox.',
  'Webhook: configure one endpoint, click Test on this page or in Notifications, then send a real campaign on the webhook channel.',
  'Org Health Cron: wait 24h after deployment and confirm latest_org_health_snapshot_at on this page becomes today\u2019s date.',
];

export const Health: React.FC = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['cc', 'health-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_super_admin_health_snapshot');
      if (error) throw error;
      return data as unknown as HealthSnapshot;
    },
    refetchInterval: 60_000,
  });

  return (
    <>
      <PageHeader
        title="Platform Health"
        subtitle="Super Admin observability snapshot and UAT checklist."
        actions={
          <button className="cc-btn" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="cc-glass p-3 mb-4 text-[12px]" style={{ color: 'hsl(var(--cc-red))' }}>
          {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card icon={Activity} title="Org Health Snapshot">
          <div className="text-[13px] font-semibold">{fmt(data?.latest_org_health_snapshot_at)}</div>
          <div className="mt-1"><FreshnessBadge iso={data?.latest_org_health_snapshot_at} warnHours={36} errorHours={72} /></div>
          <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Daily cron 03:15 UTC</div>
        </Card>

        <Card icon={Bell} title="Platform Alerts Cron">
          <div className="text-[13px] font-semibold">{fmt(data?.latest_platform_alert_at)}</div>
          <div className="mt-1"><FreshnessBadge iso={data?.latest_platform_alert_at} warnHours={2} errorHours={6} /></div>
          <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Hourly cron</div>
        </Card>

        <Card icon={Clock} title="Stale Impersonation Cleanup">
          <div className="text-[13px] font-semibold">{fmt(data?.latest_impersonation_cleanup_at)}</div>
          <div className="mt-1"><FreshnessBadge iso={data?.latest_impersonation_cleanup_at} warnHours={24} errorHours={72} /></div>
          <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Every 15 min (only on cleanup events)</div>
        </Card>

        <Card icon={AlertTriangle} title="Integration Failures (24h)">
          <div className="text-[20px] font-semibold">{isLoading ? '—' : data?.recent_integration_failures_24h ?? 0}</div>
          <div className="mt-1">
            {(data?.recent_integration_failures_24h ?? 0) === 0
              ? <StatusBadge variant="success" dot>healthy</StatusBadge>
              : <StatusBadge variant="warning" dot>investigate</StatusBadge>}
          </div>
        </Card>

        <Card icon={Webhook} title="Webhook Endpoints">
          <div className="text-[20px] font-semibold">{data?.active_webhook_endpoints ?? 0} <span className="text-[12px] opacity-70">/ {data?.total_webhook_endpoints ?? 0}</span></div>
          <div className="mt-1">
            {(data?.active_webhook_endpoints ?? 0) === 0
              ? <StatusBadge variant="warning" dot>none active</StatusBadge>
              : <StatusBadge variant="success" dot>configured</StatusBadge>}
          </div>
        </Card>

        <Card icon={UserCheck} title="Active Impersonations">
          <div className="text-[20px] font-semibold">{data?.active_impersonations ?? 0}</div>
          <div className="mt-1">
            {(data?.active_impersonations ?? 0) === 0
              ? <StatusBadge variant="muted" dot>none</StatusBadge>
              : <StatusBadge variant="info" dot>in progress</StatusBadge>}
          </div>
        </Card>

        <Card icon={CheckCircle2} title="Unresolved Alerts">
          <div className="text-[20px] font-semibold">{data?.unresolved_alerts ?? 0}</div>
          <div className="mt-1">
            {(data?.unresolved_alerts ?? 0) === 0
              ? <StatusBadge variant="success" dot>clear</StatusBadge>
              : <StatusBadge variant="warning" dot>open</StatusBadge>}
          </div>
        </Card>

        <Card icon={Clock} title="Snapshot Generated">
          <div className="text-[13px] font-semibold">{fmt(data?.generated_at)}</div>
          <div className="text-[10px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Auto-refreshes every 60s</div>
        </Card>
      </div>

      <div className="cc-glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4" style={{ color: 'hsl(var(--cc-gold))' }} />
          <h3 className="cc-h2">UAT Checklist</h3>
        </div>
        <ol className="space-y-2 list-decimal pl-5 text-[13px]">
          {UAT_STEPS.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <div className="text-[11px] mt-3" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
          All actions are recorded in Compliance / Audit Logs.
        </div>
      </div>
    </>
  );
};

export default Health;
