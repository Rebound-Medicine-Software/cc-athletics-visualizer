import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { StatusBadge } from '../primitives/StatusBadge';
import { Database, CalendarRange, Bell, Zap, Webhook, Clock } from 'lucide-react';

const integrations = [
  { name: 'CC Athletics API',     icon: Database,      status: 'healthy', latency: 142, fails: 2,  last: '12s ago' },
  { name: 'Cal.com Proxy',        icon: CalendarRange, status: 'healthy', latency: 89,  fails: 0,  last: '4s ago' },
  { name: 'NotificationAPI',      icon: Bell,          status: 'degraded', latency: 612, fails: 6,  last: '38s ago' },
  { name: 'Supabase Edge Funcs',  icon: Zap,           status: 'healthy', latency: 54,  fails: 1,  last: '2s ago' },
  { name: 'Webhook Queue',        icon: Webhook,       status: 'healthy', latency: 22,  fails: 0,  last: 'live' },
  { name: 'Cron Jobs',            icon: Clock,         status: 'healthy', latency: 0,   fails: 0,  last: '4m ago' },
];

const variantOf = (s: string) => s === 'healthy' ? 'success' : s === 'degraded' ? 'warning' : 'danger';

export const Integrations: React.FC = () => (
  <>
    <PageHeader title="API & Integrations" subtitle="External service health, latency and failure monitoring." />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {integrations.map((i) => {
        const Icon = i.icon;
        return (
          <div key={i.name} className="cc-glass p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--cc-navy) / 0.25)', border: '1px solid hsl(var(--cc-navy-glow) / 0.4)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'hsl(var(--cc-navy-glow))' }} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">{i.name}</div>
                  <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>last sync {i.last}</div>
                </div>
              </div>
              <StatusBadge variant={variantOf(i.status) as any} dot>{i.status}</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="cc-glass-strong p-3">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Latency</div>
                <div className="text-[18px] font-bold mt-1">{i.latency}<span className="text-[11px] font-medium ml-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>ms</span></div>
              </div>
              <div className="cc-glass-strong p-3">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Failures (24h)</div>
                <div className="text-[18px] font-bold mt-1" style={{ color: i.fails > 3 ? 'hsl(var(--cc-danger))' : i.fails > 0 ? 'hsl(var(--cc-warning))' : 'hsl(var(--cc-success))' }}>{i.fails}</div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button className="cc-btn flex-1 justify-center">View Logs</button>
              <button className="cc-btn flex-1 justify-center">Test</button>
            </div>
          </div>
        );
      })}
    </div>
  </>
);
