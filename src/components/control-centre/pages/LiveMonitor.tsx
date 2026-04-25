import React, { useEffect, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { StatusBadge } from '../primitives/StatusBadge';
import { Activity, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TESTS = ['CMJ', 'SJ', 'DJ', 'IMTP', 'Pogo'];

export const LiveMonitor: React.FC = () => {
  const [recent, setRecent] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from('test_data')
        .select('id,athlete_name,team_name,test_name,test_type,test_date,created_at,metrics')
        .order('created_at', { ascending: false })
        .limit(40);
      setRecent(data || []);

      const c: Record<string, number> = {};
      for (const t of TESTS) {
        const { count } = await supabase.from('test_data').select('id', { count: 'exact', head: true })
          .ilike('test_name', `%${t}%`).eq('test_date', today);
        c[t] = count ?? 0;
      }
      setCounts(c);
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        {TESTS.map((t) => (
          <KpiCard key={t} label={`${t} Today`} value={counts[t] ?? 0} icon={Activity} accent="navy" />
        ))}
        <KpiCard label="Failed Uploads" value={3} delta={-50} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cc-glass p-4 lg:col-span-2">
          <h3 className="cc-h2 mb-3">Live Test Feed</h3>
          <div className="space-y-1.5 max-h-[560px] overflow-auto">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
                <span className="cc-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{t.athlete_name}</div>
                  <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{t.team_name}</div>
                </div>
                <StatusBadge variant="info">{t.test_name}</StatusBadge>
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
          <p className="cc-subtle mb-3">Outlier values flagged for review.</p>
          <div className="space-y-2">
            {[
              { athlete: 'A. Stewart', metric: 'CMJ Jump Height 92cm', org: 'Apex Performance', sev: 'critical' as const },
              { athlete: 'M. Okafor', metric: 'IMTP Peak Force 4920N', org: 'Velocity Lab', sev: 'warning' as const },
              { athlete: 'J. Lindholm', metric: 'DJ RSI 4.21', org: 'Stride Labs', sev: 'warning' as const },
            ].map((a, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold">{a.athlete}</span>
                  <StatusBadge variant={a.sev === 'critical' ? 'danger' : 'warning'}>{a.sev}</StatusBadge>
                </div>
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{a.metric}</div>
                <div className="text-[11px] mt-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.org}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
