import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { TrendBars, TrendArea, TrendLine } from '../primitives/Charts';
import { Globe, Trophy, Sparkles } from 'lucide-react';
import { StatusBadge } from '../primitives/StatusBadge';

const sport = ['Rugby', 'Football', 'Athletics', 'Basketball', 'Hockey', 'MMA', 'Tennis', 'Rowing'].map((s, i) => ({ name: s, value: 50 + (i * 17) % 80 }));
const ageGroups = ['<14', '14-17', '18-22', '23-29', '30-39', '40+'].map((s, i) => ({ name: s, p50: 30 + i * 4, p90: 50 + i * 5 }));
const weight = ['56', '62', '69', '77', '85', '94', '105', '+105'].map((s, i) => ({ name: s + 'kg', value: 1500 + i * 220 }));
const regions = [
  { name: 'UK', value: 412 }, { name: 'EU', value: 286 }, { name: 'NA', value: 198 },
  { name: 'APAC', value: 142 }, { name: 'LATAM', value: 64 }, { name: 'AFR', value: 22 },
];

export const Analytics: React.FC = () => (
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

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-1">Sport Comparisons (CMJ Mean)</h3>
        <p className="cc-subtle mb-2">Average jump height by discipline</p>
        <TrendBars data={sport} dataKey="value" />
      </div>
      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-1">Age Group Percentiles</h3>
        <p className="cc-subtle mb-2">P50 vs P90 by age band</p>
        <TrendLine data={ageGroups} dataKey="p50" dataKey2="p90" color="hsl(var(--cc-gold))" color2="hsl(var(--cc-navy-glow))" />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-1">Weight Category Benchmark</h3>
        <p className="cc-subtle mb-2">IMTP peak force distribution</p>
        <TrendArea data={weight} dataKey="value" color="hsl(var(--cc-info))" />
      </div>
      <div className="cc-glass p-4">
        <h3 className="cc-h2 mb-1 flex items-center gap-2"><Globe className="w-4 h-4" /> Regional Heatmap</h3>
        <p className="cc-subtle mb-3">Athletes contributing benchmark data</p>
        <div className="space-y-2">
          {regions.map((r) => (
            <div key={r.name} className="flex items-center gap-3">
              <span className="w-12 text-[12px] font-semibold">{r.name}</span>
              <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: 'hsl(var(--cc-surface-2))' }}>
                <div style={{
                  width: `${(r.value / 412) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, hsl(var(--cc-navy)) 0%, hsl(var(--cc-gold)) 100%)',
                }} />
              </div>
              <span className="w-12 text-right text-[12px] font-mono">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="cc-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="cc-h2 flex items-center gap-2"><Trophy className="w-4 h-4" style={{ color: 'hsl(var(--cc-gold))' }} /> Elite Athlete Benchmark Generator</h3>
          <p className="cc-subtle">Aggregate top decile across selected filters.</p>
        </div>
        <button className="cc-btn cc-btn-gold">Run Benchmark</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CMJ Top 10%', value: '78cm', sport: 'Rugby' },
          { label: 'IMTP Top 10%', value: '4,210N', sport: 'Athletics' },
          { label: 'DJ RSI Top 10%', value: '3.42', sport: 'Basketball' },
          { label: 'Pogo Top 10%', value: '2.18', sport: 'Tennis' },
        ].map((b) => (
          <div key={b.label} className="cc-glass-strong p-3">
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{b.label}</div>
            <div className="cc-metric-value mt-1">{b.value}</div>
            <StatusBadge variant="gold">{b.sport}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  </>
);
