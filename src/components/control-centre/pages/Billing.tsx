import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendArea } from '../primitives/Charts';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { DollarSign, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const mrr = Array.from({ length: 12 }, (_, i) => ({ name: `M${i + 1}`, value: 18000 + i * 3700 + Math.round(Math.sin(i) * 1500) }));

export const Billing: React.FC = () => {
  const [tiers, setTiers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('tiers').select('*').then(({ data }) => setTiers(data || []));
  }, []);

  const tierAgg = ['Basic', 'Premium', 'Elite'].map((name) => {
    const t = tiers.filter((x) => x.name === name);
    return {
      name,
      price: t[0]?.price_monthly ?? (name === 'Basic' ? 29.99 : name === 'Premium' ? 59.99 : 99.99),
      seats: 12 + t.length * 4,
      orgs: t.length || (name === 'Basic' ? 18 : name === 'Premium' ? 9 : 4),
    };
  });

  return (
    <>
      <PageHeader title="Billing / Tiers / Revenue" subtitle="Executive SaaS finance dashboard." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="MRR" value="$61.2k" delta={10.5} icon={DollarSign} accent="gold" />
        <KpiCard label="ARR" value="$734.4k" delta={11.8} icon={TrendingUp} accent="success" />
        <KpiCard label="Failed Payments" value={5} delta={-22} icon={AlertCircle} accent="danger" />
        <KpiCard label="Seat Utilisation" value="68%" delta={4.2} icon={Users} accent="info" />
      </div>

      <div className="cc-glass p-4 mb-5">
        <h3 className="cc-h2 mb-1">MRR Growth (12 months)</h3>
        <TrendArea data={mrr} dataKey="value" color="hsl(var(--cc-gold))" height={240} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {tierAgg.map((t) => (
          <div key={t.name} className="cc-glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="cc-h2">{t.name}</h3>
              <StatusBadge variant={t.name === 'Elite' ? 'gold' : t.name === 'Premium' ? 'info' : 'muted'}>{t.orgs} orgs</StatusBadge>
            </div>
            <div className="cc-metric-value">${t.price}<span style={{ fontSize: 13, color: 'hsl(var(--cc-fg-dim))', fontWeight: 500 }}>/mo</span></div>
            <p className="cc-subtle mt-2">{t.seats} active seats</p>
            <button className="cc-btn w-full mt-4 justify-center">Edit Tier</button>
          </div>
        ))}
      </div>

      <DataTable
        rows={Array.from({ length: 8 }, (_, i) => ({
          id: `sub_${i}`,
          org: ['Apex', 'Velocity', 'Stride', 'Northgate', 'Iron Forge', 'Helix', 'Zenith', 'Pinnacle'][i],
          tier: ['Basic', 'Premium', 'Elite'][i % 3],
          mrr: [29.99, 59.99, 99.99][i % 3],
          status: i === 3 ? 'past_due' : i === 6 ? 'trialing' : 'active',
          next: ['12 May', '03 Jun', '21 May', '—', '08 Jun', '14 May', '—', '01 Jun'][i],
        }))}
        columns={[
          { key: 'org', label: 'Organisation' },
          { key: 'tier', label: 'Tier', render: (r: any) => <StatusBadge variant={r.tier === 'Elite' ? 'gold' : r.tier === 'Premium' ? 'info' : 'muted'}>{r.tier}</StatusBadge> },
          { key: 'mrr', label: 'MRR', align: 'right', render: (r: any) => `$${r.mrr}` },
          { key: 'status', label: 'Status', render: (r: any) => <StatusBadge variant={r.status === 'active' ? 'success' : r.status === 'past_due' ? 'danger' : 'warning'} dot>{r.status}</StatusBadge> },
          { key: 'next', label: 'Next Renewal', align: 'right' },
        ]}
      />
    </>
  );
};
