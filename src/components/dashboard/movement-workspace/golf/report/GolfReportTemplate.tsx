import type { MovementSession, MovementEvent } from '@/lib/movement-engine/core/types';
import type { GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';
import type { GolfFindings } from '@/lib/movement-engine/modules/golf/insights';

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

const KPI_FIELDS: Array<[keyof GolfKpis, string, string]> = [
  ['lead_load_pct', 'Lead Load', '%'],
  ['weight_transfer_pct', 'Weight Transfer', '%'],
  ['tempo_ratio', 'Tempo Ratio', ''],
  ['transition_ms', 'Transition', 'ms'],
  ['peak_force', 'Peak Force', 'N'],
  ['cop_efficiency', 'CoP Efficiency', ''],
];

export function GolfReportTemplate({
  athleteName, testDate, events, kpis, bestIndex, worstIndex,
  consistency, findings, coachTags, aiSummary,
}: Props) {
  return (
    <div>
      <h1>Golf Performance Report</h1>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>{athleteName} · {testDate}</div>

      <h2>Session Summary</h2>
      <div className="summary" style={{ background: '#1e293b', borderLeft: '3px solid #fbbf24', padding: '12px 16px', borderRadius: '0 6px 6px 0' }}>
        {aiSummary ?? `Session contains ${events.length} swing${events.length === 1 ? '' : 's'}. Consistency index ${consistency.toFixed(0)}.`}
      </div>

      <h2>Best & Worst Swing</h2>
      <ul>
        <li><strong>Best:</strong> Swing #{bestIndex + 1}</li>
        <li><strong>Worst:</strong> Swing #{worstIndex + 1}</li>
        <li><strong>Consistency:</strong> {consistency.toFixed(0)} / 100</li>
      </ul>

      <h2>Key Performance Indicators</h2>
      <div className="grid">
        {KPI_FIELDS.map(([k, label, unit]) => (
          <div className="kpi" key={k as string}>
            <div className="l">{label}</div>
            <div className="v">{(kpis[k] as number).toFixed(1)}{unit}</div>
          </div>
        ))}
      </div>

      <h2>Technical Findings</h2>
      {findings.technical.length === 0 ? <p>No critical technical flags.</p> :
        <ul>{findings.technical.map((t: any, i: number) => <li key={i}>{t.label} — {t.detail}</li>)}</ul>}

      <h2>Physical Findings</h2>
      {findings.physical.length === 0 ? <p>No physical flags.</p> :
        <ul>{findings.physical.map((t: any, i: number) => <li key={i}>{t.label} — {t.detail}</li>)}</ul>}

      <h2>Programming Focus</h2>
      {findings.programming?.length ? (
        <ul>{findings.programming.map((t: any, i: number) => <li key={i}>{t.label}{t.detail ? ` — ${t.detail}` : ''}</li>)}</ul>
      ) : <p>No prescription items.</p>}

      <h2>Coach Tags</h2>
      {coachTags.length === 0 ? <p>No tags applied.</p> :
        <div>{coachTags.map((t) => <span className="tag" key={t}>{t.replace(/_/g, ' ')}</span>)}</div>}
    </div>
  );
}
