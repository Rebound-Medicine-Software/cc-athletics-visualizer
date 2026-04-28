import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../primitives/PageHeader';
import { TrendBars, TrendArea } from '../primitives/Charts';
import { Globe, Trophy, Sparkles, Database, Users, FlaskConical } from 'lucide-react';
import { StatusBadge } from '../primitives/StatusBadge';
import { KpiCard } from '../primitives/KpiCard';
import { supabase } from '@/integrations/supabase/client';

type Overview = {
  total_test_records: number;
  total_benchmark_records: number;
  elite_benchmark_athletes: number;
  active_sports: number;
  countries: number;
  regions: number;
  tests_this_month: number;
};

type SportRow = { sport: string; test_count: number; athlete_count: number; avg_cmj_height: number | null; avg_imtp_peak: number | null };
type RegionRow = { country: string; region: string; organisation_count: number; athlete_count: number; test_count: number };
type EliteRow = { sport: string; age_group: number | null; weight_category: string; athlete_count: number; avg_cmj_height: number | null; avg_cmj_peak_power: number | null; avg_imtp_peak: number | null; avg_imtp_relative: number | null };

export const Analytics: React.FC = () => {
  const { data: overview } = useQuery({
    queryKey: ['cc-analytics-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_analytics_warehouse_overview');
      if (error) throw error;
      return data as unknown as Overview;
    },
    refetchInterval: 60_000,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['cc-analytics-sports'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sport_benchmark_distribution');
      if (error) throw error;
      return (data || []) as SportRow[];
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['cc-analytics-regions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_regional_testing_distribution');
      if (error) throw error;
      return (data || []) as RegionRow[];
    },
  });

  const { data: elite = [] } = useQuery({
    queryKey: ['cc-analytics-elite'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_elite_benchmark_summary');
      if (error) throw error;
      return (data || []) as EliteRow[];
    },
  });

  const sportChart = useMemo(
    () => sports.slice(0, 10).map((s) => ({ name: s.sport, value: Number(s.avg_cmj_height) || 0 })),
    [sports]
  );

  const weightChart = useMemo(() => {
    const byWeight = new Map<string, { sum: number; n: number }>();
    elite.forEach((e) => {
      if (!e.weight_category || !e.avg_imtp_peak) return;
      const cur = byWeight.get(e.weight_category) || { sum: 0, n: 0 };
      cur.sum += Number(e.avg_imtp_peak);
      cur.n += 1;
      byWeight.set(e.weight_category, cur);
    });
    return Array.from(byWeight.entries())
      .map(([name, v]) => ({ name, value: Math.round(v.sum / v.n) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [elite]);

  const regionAggregates = useMemo(() => {
    const map = new Map<string, number>();
    regions.forEach((r) => map.set(r.country, (map.get(r.country) || 0) + Number(r.athlete_count || 0)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [regions]);

  const maxRegion = Math.max(1, ...regionAggregates.map((r) => r.value));

  const eliteHighlights = useMemo(() => {
    const top = (key: keyof EliteRow) => {
      const sorted = [...elite].filter((e) => e[key] != null).sort((a, b) => Number(b[key]) - Number(a[key]));
      return sorted[0];
    };
    return [
      { label: 'Top CMJ Height', row: top('avg_cmj_height'), unit: 'cm', field: 'avg_cmj_height' as const },
      { label: 'Top CMJ Peak Power', row: top('avg_cmj_peak_power'), unit: 'W', field: 'avg_cmj_peak_power' as const },
      { label: 'Top IMTP Peak', row: top('avg_imtp_peak'), unit: 'N', field: 'avg_imtp_peak' as const },
      { label: 'Top IMTP / kg', row: top('avg_imtp_relative'), unit: 'N/kg', field: 'avg_imtp_relative' as const },
    ];
  }, [elite]);

  return (
    <>
      <PageHeader
        title="Analytics Warehouse"
        subtitle="Cross-tenant benchmark intelligence and elite performance analytics."
        actions={
          <>
            <button className="cc-btn"><Sparkles className="w-3.5 h-3.5" /> Generate Benchmark</button>
            <button className="cc-btn cc-btn-primary">Export Dataset</button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Test Records" value={overview?.total_test_records ?? '—'} icon={FlaskConical} accent="navy" />
        <KpiCard label="Benchmark Records" value={overview?.total_benchmark_records ?? '—'} icon={Database} accent="info" />
        <KpiCard label="Elite Athletes" value={overview?.elite_benchmark_athletes ?? '—'} icon={Trophy} accent="gold" />
        <KpiCard label="Sports" value={overview?.active_sports ?? '—'} icon={Sparkles} accent="success" />
        <KpiCard label="Countries / Regions" value={overview ? `${overview.countries} / ${overview.regions}` : '—'} icon={Globe} accent="navy" />
        <KpiCard label="Tests MTD" value={overview?.tests_this_month ?? '—'} icon={Users} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1">Sport Comparisons (CMJ Mean)</h3>
          <p className="cc-subtle mb-2">Average jump height (cm) by sport — elite dataset</p>
          {sportChart.length ? <TrendBars data={sportChart} dataKey="value" /> : <p className="cc-subtle text-xs">No data.</p>}
        </div>
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1">Sport Distribution</h3>
          <p className="cc-subtle mb-2">Athlete & test counts per sport</p>
          <div className="overflow-auto max-h-[260px]">
            <table className="w-full text-[12px]">
              <thead><tr style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                <th className="text-left py-1">Sport</th><th className="text-right">Athletes</th><th className="text-right">Tests</th><th className="text-right">Avg IMTP (N)</th>
              </tr></thead>
              <tbody>
                {sports.map((s) => (
                  <tr key={s.sport} style={{ borderTop: '1px solid hsl(var(--cc-border))' }}>
                    <td className="py-1">{s.sport}</td>
                    <td className="text-right font-mono">{s.athlete_count}</td>
                    <td className="text-right font-mono">{s.test_count}</td>
                    <td className="text-right font-mono">{s.avg_imtp_peak ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1">Weight Category Benchmark</h3>
          <p className="cc-subtle mb-2">Average IMTP peak force by weight class</p>
          {weightChart.length ? <TrendArea data={weightChart} dataKey="value" color="hsl(var(--cc-info))" /> : <p className="cc-subtle text-xs">No data.</p>}
        </div>
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1 flex items-center gap-2"><Globe className="w-4 h-4" /> Regional Heatmap</h3>
          <p className="cc-subtle mb-3">Athletes contributing benchmark data</p>
          <div className="space-y-2">
            {regionAggregates.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="w-20 text-[12px] font-semibold truncate">{r.name}</span>
                <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: 'hsl(var(--cc-surface-2))' }}>
                  <div style={{
                    width: `${(r.value / maxRegion) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, hsl(var(--cc-navy)) 0%, hsl(var(--cc-gold)) 100%)',
                  }} />
                </div>
                <span className="w-14 text-right text-[12px] font-mono">{r.value}</span>
              </div>
            ))}
            {!regionAggregates.length && <p className="cc-subtle text-xs">No regional data.</p>}
          </div>
        </div>
      </div>

      <div className="cc-glass p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="cc-h2 flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: 'hsl(var(--cc-gold))' }} /> Elite Athlete Benchmark Highlights</h3>
            <p className="cc-subtle">Top sport × age × weight cohorts from elite_athlete_data.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {eliteHighlights.map((b) => (
            <div key={b.label} className="cc-glass-strong p-3">
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{b.label}</div>
              <div className="cc-metric-value mt-1">{b.row ? `${b.row[b.field]}${b.unit}` : '—'}</div>
              <StatusBadge variant="gold">{b.row?.sport ?? '—'}</StatusBadge>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-2">Elite Benchmark Summary</h3>
        <p className="cc-subtle mb-3">Per sport / age group / weight category</p>
        <div className="overflow-auto max-h-[340px]">
          <table className="w-full text-[12px]">
            <thead><tr style={{ color: 'hsl(var(--cc-fg-muted))' }}>
              <th className="text-left py-1">Sport</th>
              <th className="text-left">Age</th>
              <th className="text-left">Weight</th>
              <th className="text-right">Athletes</th>
              <th className="text-right">CMJ (cm)</th>
              <th className="text-right">CMJ Power (W)</th>
              <th className="text-right">IMTP (N)</th>
              <th className="text-right">IMTP /kg</th>
            </tr></thead>
            <tbody>
              {elite.map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid hsl(var(--cc-border))' }}>
                  <td className="py-1">{e.sport}</td>
                  <td>{e.age_group ?? '—'}</td>
                  <td>{e.weight_category}</td>
                  <td className="text-right font-mono">{e.athlete_count}</td>
                  <td className="text-right font-mono">{e.avg_cmj_height ?? '—'}</td>
                  <td className="text-right font-mono">{e.avg_cmj_peak_power ?? '—'}</td>
                  <td className="text-right font-mono">{e.avg_imtp_peak ?? '—'}</td>
                  <td className="text-right font-mono">{e.avg_imtp_relative ?? '—'}</td>
                </tr>
              ))}
              {!elite.length && <tr><td colSpan={8} className="py-2 cc-subtle text-xs">No elite benchmark data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
