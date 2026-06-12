import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GolfFindings, Finding } from '@/lib/movement-engine/modules/golf/insights';
import { CheckCircle2, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

const Icon = ({ severity }: { severity: Finding['severity'] }) =>
  severity === 'good' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
  severity === 'critical' ? <ShieldAlert className="h-4 w-4 text-red-500" /> :
  severity === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
  <Info className="h-4 w-4 text-sky-500" />;

const Section = ({ title, items }: { title: string; items: Finding[] }) => (
  <Card className="p-4 space-y-2 bg-slate-950 border-slate-800 text-slate-100">
    <h3 className="text-xs uppercase tracking-widest text-slate-400">{title}</h3>
    {items.length === 0 && <p className="text-sm text-slate-500">No findings.</p>}
    <ul className="space-y-2">
      {items.map((f) => (
        <li key={f.id} className="flex items-start gap-2 text-sm">
          <Icon severity={f.severity} />
          <div className="flex-1">
            <div className="text-slate-100">{f.label}</div>
            {f.evidence && <div className="text-xs text-slate-400">{f.evidence}</div>}
          </div>
        </li>
      ))}
    </ul>
  </Card>
);

export function GolfInsightsPanel({ findings }: { findings: GolfFindings }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Section title="Technical Findings" items={findings.technical} />
      <Section title="Physical Findings" items={findings.physical} />
      <Section title="Programming Focus" items={findings.programming} />
    </div>
  );
}
