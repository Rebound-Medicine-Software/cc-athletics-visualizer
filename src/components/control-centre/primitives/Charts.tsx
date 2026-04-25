import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

interface BaseProps {
  data: any[];
  dataKey: string;
  xKey?: string;
  height?: number;
  color?: string;
}

const TooltipBox = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'hsl(222 30% 8% / 0.95)',
        border: '1px solid hsl(var(--cc-border-strong))',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 12,
        color: 'hsl(var(--cc-fg))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ color: 'hsl(var(--cc-fg-dim))', marginBottom: 4, fontSize: 11 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

const baseAxisProps = {
  stroke: 'hsl(var(--cc-fg-dim))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

export const TrendArea: React.FC<BaseProps> = ({ data, dataKey, xKey = 'name', height = 220, color = 'hsl(var(--cc-navy-glow))' }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
      <defs>
        <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="hsl(var(--cc-border) / 0.4)" vertical={false} />
      <XAxis dataKey={xKey} {...baseAxisProps} />
      <YAxis {...baseAxisProps} />
      <Tooltip content={<TooltipBox />} cursor={{ stroke: color, strokeOpacity: 0.3 }} />
      <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#g-${dataKey})`} />
    </AreaChart>
  </ResponsiveContainer>
);

export const TrendLine: React.FC<BaseProps & { color2?: string; dataKey2?: string }> = ({
  data, dataKey, dataKey2, xKey = 'name', height = 220, color = 'hsl(var(--cc-gold))', color2 = 'hsl(var(--cc-navy-glow))',
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
      <CartesianGrid stroke="hsl(var(--cc-border) / 0.4)" vertical={false} />
      <XAxis dataKey={xKey} {...baseAxisProps} />
      <YAxis {...baseAxisProps} />
      <Tooltip content={<TooltipBox />} />
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} />
      {dataKey2 && <Line type="monotone" dataKey={dataKey2} stroke={color2} strokeWidth={2.5} dot={false} />}
    </LineChart>
  </ResponsiveContainer>
);

export const TrendBars: React.FC<BaseProps & { highlightIndex?: number }> = ({
  data, dataKey, xKey = 'name', height = 220, color = 'hsl(var(--cc-navy-glow))', highlightIndex,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
      <CartesianGrid stroke="hsl(var(--cc-border) / 0.4)" vertical={false} />
      <XAxis dataKey={xKey} {...baseAxisProps} />
      <YAxis {...baseAxisProps} />
      <Tooltip content={<TooltipBox />} cursor={{ fill: 'hsl(var(--cc-surface) / 0.5)' }} />
      <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={i === highlightIndex ? 'hsl(var(--cc-gold))' : color} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
