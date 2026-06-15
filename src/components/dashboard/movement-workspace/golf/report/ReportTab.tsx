import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { GolfReportTemplate } from './GolfReportTemplate';
import type { MovementSession, MovementEvent } from '@/lib/movement-engine/core/types';
import type { GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';
import type { GolfFindings } from '@/lib/movement-engine/modules/golf/insights';
import { useRef } from 'react';

interface Props {
  athleteName: string;
  testDate: string;
  session: MovementSession | null;
  events: MovementEvent[];
  kpis: GolfKpis;
  swingScores: number[];
  bestIndex: number;
  worstIndex: number;
  consistency: number;
  findings: GolfFindings;
  coachTags: string[];
  aiSummary?: string;
}

export function ReportTab(props: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const printReport = () => {
    if (!ref.current) return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!w) { toast.error('Pop-up blocked — allow pop-ups to print the report.'); return; }
    w.document.write(`<!doctype html><html><head><title>Golf Report — ${props.athleteName}</title>
      <meta charset="utf-8"/>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 32px; }
        h1, h2, h3 { color: #fde68a; letter-spacing: 0.02em; }
        h1 { font-size: 28px; margin: 0 0 4px; }
        h2 { font-size: 18px; text-transform: uppercase; letter-spacing: 0.15em; margin: 24px 0 8px; border-bottom: 1px solid #334155; padding-bottom: 4px; }
        h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .kpi { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
        .kpi .v { font-size: 22px; color: #fbbf24; font-weight: 600; }
        .kpi .l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
        ul { padding-left: 18px; } li { margin: 4px 0; font-size: 13px; }
        .tag { display: inline-block; background: #334155; color: #cbd5e1; border-radius: 999px; padding: 2px 10px; margin: 2px; font-size: 11px; }
        .summary { background: #1e293b; border-left: 3px solid #fbbf24; padding: 12px 16px; border-radius: 0 6px 6px 0; }
        @media print { body { background: white; color: #0f172a; } h1,h2,h3 { color: #1e3a6e; } .kpi { background: #f8fafc; border-color: #cbd5e1;} .kpi .v { color: #1e3a6e; } .summary { background: #f8fafc; } }
      </style></head><body>${ref.current.innerHTML}<script>setTimeout(()=>window.print(),250);</script></body></html>`);
    w.document.close();
  };

  if (!props.session) {
    return (
      <Card className="p-8 text-center bg-slate-950 border-slate-800 text-slate-100">
        <FileText className="mx-auto h-8 w-8 text-amber-400/60 mb-3" />
        <p className="text-sm text-slate-400">Open a session to generate a report.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs uppercase tracking-widest text-slate-300">Golf Performance Report</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-300" onClick={printReport}>
            <Printer className="h-3 w-3 mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-300" onClick={printReport}>
            <Download className="h-3 w-3 mr-1" /> Save as PDF
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-slate-950 border-slate-800 text-slate-100">
        <div ref={ref}>
          <GolfReportTemplate {...props} />
        </div>
      </Card>
    </div>
  );
}
