import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage change
  icon?: LucideIcon;
  hint?: string;
  accent?: 'navy' | 'gold' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const accentMap: Record<string, string> = {
  navy: 'hsl(var(--cc-navy-glow))',
  gold: 'hsl(var(--cc-gold))',
  success: 'hsl(var(--cc-success))',
  warning: 'hsl(var(--cc-warning))',
  danger: 'hsl(var(--cc-danger))',
  info: 'hsl(var(--cc-info))',
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta, icon: Icon, hint, accent = 'navy', onClick }) => {
  const trendUp = (delta ?? 0) > 0;
  const trendDown = (delta ?? 0) < 0;
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
  const color = accentMap[accent];

  return (
    <div
      className="cc-glass p-4 cursor-default"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
          {label}
        </span>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color.replace(')', ' / 0.12)')}`, border: `1px solid ${color.replace(')', ' / 0.25)')}` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        )}
      </div>
      <div className="cc-metric-value">{value}</div>
      <div className="flex items-center justify-between mt-2">
        {delta !== undefined && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{
              color: trendUp ? 'hsl(var(--cc-success))' : trendDown ? 'hsl(var(--cc-danger))' : 'hsl(var(--cc-fg-muted))',
            }}
          >
            <TrendIcon className="w-3 h-3" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{hint}</span>}
      </div>
    </div>
  );
};
