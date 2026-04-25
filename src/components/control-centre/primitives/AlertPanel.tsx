import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
  icon?: LucideIcon;
  time?: string;
}

const sevColor = {
  critical: 'hsl(var(--cc-danger))',
  warning: 'hsl(var(--cc-warning))',
  info: 'hsl(var(--cc-info))',
};

export const AlertPanel: React.FC<{ title: string; alerts: AlertItem[] }> = ({ title, alerts }) => (
  <div className="cc-glass p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="cc-h2">{title}</h3>
      <span className="cc-badge cc-badge-muted">{alerts.length}</span>
    </div>
    <div className="space-y-2">
      {alerts.length === 0 && <p className="cc-subtle">All systems nominal.</p>}
      {alerts.map((a) => {
        const Icon = a.icon;
        const color = sevColor[a.severity];
        return (
          <div
            key={a.id}
            className="flex items-start gap-3 p-2.5 rounded-lg"
            style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}
          >
            {Icon && (
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                   style={{ background: `${color.replace(')', ' / 0.12)')}` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: 'hsl(var(--cc-fg))' }}>{a.title}</span>
                <span className="cc-badge" style={{ background: `${color.replace(')', ' / 0.12)')}`, color, borderColor: `${color.replace(')', ' / 0.3)')}` }}>{a.severity}</span>
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{a.detail}</p>
            </div>
            {a.time && <span className="text-[11px] flex-shrink-0" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.time}</span>}
          </div>
        );
      })}
    </div>
  </div>
);

export type { AlertItem };
