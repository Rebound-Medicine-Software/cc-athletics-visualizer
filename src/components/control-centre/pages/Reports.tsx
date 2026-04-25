import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendLine } from '../primitives/Charts';
import { DataTable } from '../primitives/DataTable';
import { StatusBadge } from '../primitives/StatusBadge';
import { FileText, Sparkles, Clock, AlertTriangle } from 'lucide-react';

const trend = Array.from({ length: 12 }, (_, i) => ({ name: `W${i + 1}`, reports: 80 + i * 14 + Math.round(Math.sin(i) * 10), ai: 30 + i * 9 }));

const jobs = Array.from({ length: 12 }, (_, i) => ({
  id: `job_${1000 + i}`,
  org: ['Apex Performance', 'Velocity Lab', 'Stride Labs', 'Northgate'][i % 4],
  type: i % 3 === 0 ? 'AI Insight' : 'PDF Report',
  duration: `${(2 + (i * 0.4) % 5).toFixed(1)}s`,
  status: i % 7 === 0 ? 'failed' : i % 5 === 0 ? 'queued' : 'completed',
  notif: i % 6 === 0 ? 'failed' : 'sent',
  created: `${(i + 1) * 6}m ago`,
}));

export const Reports: React.FC = () => (
  <>
    <PageHeader title="Reports & AI Engine" subtitle="PDF generation, AI Coach insights & delivery health." />

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <KpiCard label="Reports Generated" value="3,612" delta={9.8} icon={FileText} accent="navy" />
      <KpiCard label="AI Coach Insights" value="1,284" delta={42.1} icon={Sparkles} accent="gold" />
      <KpiCard label="Avg Generation Time" value="3.4s" delta={-12.3} icon={Clock} accent="success" />
      <KpiCard label="Failed Jobs" value={9} delta={-18.0} icon={AlertTriangle} accent="danger" />
    </div>

    <div className="cc-glass p-4 mb-5">
      <h3 className="cc-h2 mb-1">Processing Trend</h3>
      <p className="cc-subtle mb-2">PDF reports vs AI insights (12 weeks)</p>
      <TrendLine data={trend} dataKey="reports" dataKey2="ai" color="hsl(var(--cc-navy-glow))" color2="hsl(var(--cc-gold))" />
    </div>

    <DataTable
      rows={jobs}
      columns={[
        { key: 'id', label: 'Job ID', render: (r: any) => <code className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{r.id}</code> },
        { key: 'org', label: 'Organisation' },
        { key: 'type', label: 'Type', render: (r: any) => <StatusBadge variant={r.type === 'AI Insight' ? 'gold' : 'info'}>{r.type}</StatusBadge> },
        { key: 'duration', label: 'Duration', align: 'right' },
        { key: 'status', label: 'Status', render: (r: any) => <StatusBadge variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'} dot>{r.status}</StatusBadge> },
        { key: 'notif', label: 'Notification', render: (r: any) => <StatusBadge variant={r.notif === 'sent' ? 'success' : 'danger'}>{r.notif}</StatusBadge> },
        { key: 'created', label: 'Created', align: 'right' },
      ]}
    />
  </>
);
