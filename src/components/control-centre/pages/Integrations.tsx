import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { StatusBadge } from '../primitives/StatusBadge';
import { Database, CalendarRange, Bell, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IntegrationDetailDrawer } from '../primitives/IntegrationDetailDrawer';
import { toast } from 'sonner';

interface OverviewRow {
  integration_name: string;
  status: 'healthy' | 'degraded' | 'down' | 'inactive';
  success_count_24h: number;
  failure_count_24h: number;
  avg_latency_ms_24h: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  affected_team_count: number;
  team_connected_count: number | null;
}

const META: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  cc_athletics:            { label: 'CC Athletics API',      icon: Database },
  cal_com:                 { label: 'Cal.com Proxy',         icon: CalendarRange },
  notificationapi:         { label: 'NotificationAPI',       icon: Bell },
  lovable_ai_gateway:      { label: 'Lovable AI Gateway',    icon: Sparkles },
  supabase_edge_functions: { label: 'Supabase Edge Funcs',   icon: Zap },
};

const variantOf = (s: string) =>
  s === 'healthy' ? 'success'
  : s === 'degraded' ? 'warning'
  : s === 'down' ? 'danger'
  : 'muted';

const relTime = (iso: string | null) => {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const Integrations: React.FC = () => {
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_integration_overview');
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data || []) as unknown as OverviewRow[]);
  };

  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    const order = ['cc_athletics', 'cal_com', 'notificationapi', 'lovable_ai_gateway', 'supabase_edge_functions'];
    return [...rows].sort((a, b) => {
      const ai = order.indexOf(a.integration_name);
      const bi = order.indexOf(b.integration_name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [rows]);

  return (
    <>
      <PageHeader
        title="API & Integrations"
        subtitle="External service health, latency and failure monitoring."
        actions={
          <button className="cc-btn" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        }
      />

      {loading && rows.length === 0 ? (
        <div className="cc-glass p-6 text-sm" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Loading integration health…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((i) => {
            const meta = META[i.integration_name] || { label: i.integration_name, icon: Database };
            const Icon = meta.icon;
            const lastEvent = (() => {
              const dates = [i.last_success_at, i.last_failure_at].filter(Boolean) as string[];
              if (!dates.length) return null;
              return dates.sort().reverse()[0];
            })();
            return (
              <div key={i.integration_name} className="cc-glass p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--cc-navy) / 0.25)', border: '1px solid hsl(var(--cc-navy-glow) / 0.4)' }}>
                      <Icon className="w-5 h-5" style={{ color: 'hsl(var(--cc-navy-glow))' }} />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold">{meta.label}</div>
                      <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>last event {relTime(lastEvent)}</div>
                    </div>
                  </div>
                  <StatusBadge variant={variantOf(i.status) as any} dot>{i.status}</StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="cc-glass-strong p-3">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Avg Latency 24h</div>
                    <div className="text-[18px] font-bold mt-1">{i.avg_latency_ms_24h || 0}<span className="text-[11px] font-medium ml-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>ms</span></div>
                  </div>
                  <div className="cc-glass-strong p-3">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Failures (24h)</div>
                    <div className="text-[18px] font-bold mt-1" style={{ color: i.failure_count_24h > 3 ? 'hsl(var(--cc-danger))' : i.failure_count_24h > 0 ? 'hsl(var(--cc-warning))' : 'hsl(var(--cc-success))' }}>{i.failure_count_24h}</div>
                  </div>
                  <div className="cc-glass-strong p-3">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Success (24h)</div>
                    <div className="text-[18px] font-bold mt-1" style={{ color: 'hsl(var(--cc-success))' }}>{i.success_count_24h}</div>
                  </div>
                  <div className="cc-glass-strong p-3">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Affected Orgs</div>
                    <div className="text-[18px] font-bold mt-1">{i.affected_team_count}{i.team_connected_count != null && <span className="text-[11px] font-medium ml-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>/ {i.team_connected_count}</span>}</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button className="cc-btn flex-1 justify-center" onClick={() => setSelected(i.integration_name)}>View Logs</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <IntegrationDetailDrawer
        integrationName={selected}
        displayName={selected ? (META[selected]?.label || selected) : undefined}
        onClose={() => setSelected(null)}
      />
    </>
  );
};
