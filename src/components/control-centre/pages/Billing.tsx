import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendArea } from '../primitives/Charts';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { DollarSign, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRevenueTrend } from '../hooks/useRevenueTrend';

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${(n ?? 0).toFixed(2)}`;
};
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

const tierVariant = (name?: string | null) => {
  const n = (name || '').toLowerCase();
  if (n.includes('elite')) return 'gold' as const;
  if (n.includes('premium')) return 'info' as const;
  return 'muted' as const;
};

const statusVariant = (s?: string | null) => {
  const v = (s || '').toLowerCase();
  if (v === 'active') return 'success' as const;
  if (['past_due', 'unpaid', 'failed', 'cancelled'].includes(v)) return 'danger' as const;
  if (['trialing', 'trial'].includes(v)) return 'warning' as const;
  return 'muted' as const;
};

export const Billing: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: revTrend } = useRevenueTrend(180);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: ov }, { data: subList }, { data: dist }] = await Promise.all([
        (supabase as any).rpc('get_billing_overview'),
        (supabase as any).rpc('list_billing_subscriptions'),
        (supabase as any).rpc('get_tier_distribution'),
      ]);
      if (!alive) return;
      setOverview(ov || null);
      setSubs(subList || []);
      setTiers(dist || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const trendData = useMemo(
    () => (revTrend || []).map((p) => ({ name: p.name, value: p.value })),
    [revTrend]
  );

  const stripeConnected = !!overview?.stripe_connected;

  return (
    <>
      <PageHeader
        title="Billing / Tiers / Revenue"
        subtitle={stripeConnected ? 'Live billing data.' : 'Live billing data — Stripe payments not connected yet.'}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="MRR" value={fmtMoney(Number(overview?.mrr ?? 0))} icon={DollarSign} accent="gold" />
        <KpiCard label="ARR" value={fmtMoney(Number(overview?.arr ?? 0))} icon={TrendingUp} accent="success" />
        <KpiCard label="Failed Payments" value={Number(overview?.failed_payments ?? 0)} icon={AlertCircle} accent="danger" />
        <KpiCard label="Active Subs" value={Number(overview?.active_subscriptions ?? 0)} icon={Users} accent="info" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Trial Accounts" value={Number(overview?.trial_accounts ?? 0)} accent="info" />
        <KpiCard label="Total Seats" value={Number(overview?.total_seats ?? 0)} accent="muted" />
        <KpiCard label="Avg Revenue / Org" value={fmtMoney(Number(overview?.avg_revenue_per_org ?? 0))} accent="success" />
        <KpiCard label="Organisations" value={Number(overview?.organisation_count ?? 0)} accent="muted" />
      </div>

      <div className="cc-glass p-4 mb-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="cc-h2">Revenue Trend (180 days)</h3>
          {!stripeConnected && (
            <StatusBadge variant="warning" dot>Stripe not connected</StatusBadge>
          )}
        </div>
        <TrendArea data={trendData} dataKey="value" color="hsl(var(--cc-gold))" height={240} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {(tiers.length ? tiers : []).map((t: any) => (
          <div key={t.tier_name} className="cc-glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="cc-h2">{t.tier_name}</h3>
              <StatusBadge variant={tierVariant(t.tier_name)}>
                {Number(t.organisation_count)} {Number(t.organisation_count) === 1 ? 'org' : 'orgs'}
              </StatusBadge>
            </div>
            <div className="cc-metric-value">
              {fmtMoney(Number(t.monthly_revenue ?? 0))}
              <span style={{ fontSize: 13, color: 'hsl(var(--cc-fg-dim))', fontWeight: 500 }}>/mo</span>
            </div>
            <p className="cc-subtle mt-2">
              Avg seats: {Number(t.avg_seats ?? 0)} · {Number(t.percentage_of_total ?? 0)}% of accounts
            </p>
            <button
              className="cc-btn w-full mt-4 justify-center opacity-60 cursor-not-allowed"
              disabled
              title="Stripe not connected — tier editing requires Stripe webhooks"
            >
              Edit Tier (Stripe required)
            </button>
          </div>
        ))}
        {!loading && tiers.length === 0 && (
          <div className="cc-glass p-5 col-span-full cc-subtle">No tier data available.</div>
        )}
      </div>

      <DataTable
        rows={subs}
        columns={[
          { key: 'organisation_name', label: 'Organisation', render: (r: any) => r.organisation_name || '—' },
          { key: 'tier_name', label: 'Tier', render: (r: any) => (
            <StatusBadge variant={tierVariant(r.tier_name)}>{r.tier_name || '—'}</StatusBadge>
          )},
          { key: 'monthly_value', label: 'MRR', align: 'right', render: (r: any) => fmtMoney(Number(r.monthly_value ?? 0)) },
          { key: 'seat_count', label: 'Seats', align: 'right' },
          { key: 'status', label: 'Status', render: (r: any) => (
            <StatusBadge variant={statusVariant(r.status)} dot>{r.status}</StatusBadge>
          )},
          { key: 'payment_status', label: 'Payment', render: (r: any) =>
            r.payment_status
              ? <StatusBadge variant={statusVariant(r.payment_status)}>{r.payment_status}</StatusBadge>
              : <span className="cc-subtle">—</span>
          },
          { key: 'renewal_date', label: 'Renewal', align: 'right', render: (r: any) => fmtDate(r.renewal_date) },
          { key: 'stripe_subscription_id', label: 'Stripe', render: (r: any) =>
            r.stripe_subscription_id
              ? <span className="cc-subtle font-mono text-xs">{r.stripe_subscription_id.slice(0, 14)}…</span>
              : <span className="cc-subtle">not connected</span>
          },
          { key: 'churn_risk_score', label: 'Churn', align: 'right', render: (r: any) => `${Number(r.churn_risk_score ?? 0)}` },
        ]}
      />
      {!loading && subs.length === 0 && (
        <div className="cc-glass p-5 mt-3 cc-subtle text-center">No subscriptions found.</div>
      )}
    </>
  );
};
