import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendArea } from '../primitives/Charts';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { CalendarRange, AlertTriangle, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export const Bookings: React.FC = () => {
  const { data: overview } = useQuery({
    queryKey: ['cc-bookings-overview'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_bookings_overview');
      if (error) throw error;
      return data as {
        bookings_this_month: number;
        bookings_today: number;
        cancellations_this_month: number;
        failed_syncs_24h: number;
        connected_calcom_orgs: number;
        total_bookings: number;
        booking_limit_total: number | null;
        booking_utilisation_percent: number | null;
      };
    },
    refetchInterval: 60_000,
  });

  const { data: trends } = useQuery({
    queryKey: ['cc-bookings-trends', 14],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_bookings_trends', { days_back: 14 });
      if (error) throw error;
      return (data ?? []) as Array<{ day: string; created_count: number; cancelled_count: number; sync_failure_count: number }>;
    },
    refetchInterval: 60_000,
  });

  const { data: failures } = useQuery({
    queryKey: ['cc-bookings-failures'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('list_booking_failures', { row_limit: 25 });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        source: string;
        organisation_name: string | null;
        booking_id: string | null;
        failure_reason: string;
        occurred_at: string;
      }>;
    },
    refetchInterval: 60_000,
  });

  const trend = (trends ?? []).map((t, i) => ({ name: `D${i + 1}`, value: Number(t.created_count) }));

  const utilisation = overview?.booking_utilisation_percent;
  const utilisationLabel = utilisation == null ? '—' : `${utilisation}%`;

  return (
    <>
      <PageHeader title="Bookings Infrastructure" subtitle="Cal.com sync health, slot utilisation & conflict monitoring." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Bookings This Month" value={overview?.bookings_this_month ?? 0} icon={CalendarRange} accent="navy" />
        <KpiCard label="Failed Syncs (24h)" value={overview?.failed_syncs_24h ?? 0} icon={AlertTriangle} accent="danger" />
        <KpiCard label="Connected Cal.com Orgs" value={overview?.connected_calcom_orgs ?? 0} icon={Users} accent="info" />
        <KpiCard label="Cancellations (MTD)" value={overview?.cancellations_this_month ?? 0} icon={Clock} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="cc-glass p-4 lg:col-span-2">
          <h3 className="cc-h2 mb-1">Booking Volume (14 days)</h3>
          <p className="cc-subtle mb-2">Daily creations across all tenants</p>
          <TrendArea data={trend} dataKey="value" color="hsl(var(--cc-navy-glow))" />
        </div>
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-3">Utilisation</h3>
          <div className="mb-3">
            <div className="flex justify-between text-[12px] mb-1">
              <span>Platform booking quota</span>
              <span className="font-mono" style={{ color: 'hsl(var(--cc-gold))' }}>{utilisationLabel}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--cc-surface-2))' }}>
              <div style={{ width: `${Math.min(utilisation ?? 0, 100)}%`, height: '100%', background: 'var(--cc-grad-gold)' }} />
            </div>
          </div>
          <div className="text-[12px] cc-subtle space-y-1 mt-3">
            <div className="flex justify-between"><span>Bookings today</span><span className="font-mono">{overview?.bookings_today ?? 0}</span></div>
            <div className="flex justify-between"><span>Total bookings</span><span className="font-mono">{overview?.total_bookings ?? 0}</span></div>
            <div className="flex justify-between"><span>Quota total</span><span className="font-mono">{overview?.booking_limit_total ?? '—'}</span></div>
          </div>
        </div>
      </div>

      <DataTable
        rows={(failures ?? []).map((f) => ({
          id: f.id,
          org: f.organisation_name ?? '—',
          error: f.failure_reason,
          source: f.source,
          time: formatDistanceToNow(new Date(f.occurred_at), { addSuffix: true }),
          sev: f.source.includes('cal') ? 'critical' : 'warning',
        }))}
        columns={[
          { key: 'org', label: 'Organisation' },
          { key: 'error', label: 'Error', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.error}</code> },
          { key: 'source', label: 'Source' },
          { key: 'sev', label: 'Severity', render: (r: any) => <StatusBadge variant={r.sev === 'critical' ? 'danger' : r.sev === 'warning' ? 'warning' : 'info'}>{r.sev}</StatusBadge> },
          { key: 'time', label: 'When', align: 'right' },
        ]}
      />
    </>
  );
};
