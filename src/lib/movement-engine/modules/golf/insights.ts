import type { GolfKpis } from './kpis';

export interface GolfFindings {
  technical: Finding[];
  physical: Finding[];
  programming: Finding[];
}
export interface Finding {
  id: string;
  label: string;
  severity: 'good' | 'info' | 'warn' | 'critical';
  evidence?: string;
}

export function deriveGolfInsights(kpisList: GolfKpis[]): GolfFindings {
  if (!kpisList.length) return { technical: [], physical: [], programming: [] };
  const avg = (k: keyof GolfKpis) => kpisList.reduce((a, b) => a + (b[k] ?? 0), 0) / kpisList.length;

  const lead = avg('lead_load_pct');
  const transfer = avg('weight_transfer_pct');
  const tempo = avg('tempo_ratio');
  const cop = avg('cop_quality');
  const transitionMs = avg('transition_ms');

  const technical: Finding[] = [];
  const physical: Finding[] = [];
  const programming: Finding[] = [];

  if (lead < 70) technical.push({
    id: 'poor_lead_loading', label: 'Poor lead-side loading at impact',
    severity: lead < 60 ? 'critical' : 'warn',
    evidence: `Lead load ${lead.toFixed(0)}% (target ≥ 75%)`,
  });
  if (transfer < 15) technical.push({
    id: 'late_pressure_transfer', label: 'Late pressure transfer to lead side',
    severity: 'warn',
    evidence: `Δ lead from top → impact: ${transfer.toFixed(0)}%`,
  });
  if (transitionMs > 250) technical.push({
    id: 'poor_transition', label: 'Slow transition timing',
    severity: 'warn',
    evidence: `Transition ${transitionMs.toFixed(0)} ms`,
  });
  if (cop < 0.6) technical.push({
    id: 'inconsistent_sequencing', label: 'Inconsistent CoP sequencing post-impact',
    severity: 'info', evidence: `CoP quality ${(cop * 100).toFixed(0)}%`,
  });
  if (tempo > 0 && (tempo < 1.8 || tempo > 3.8)) technical.push({
    id: 'tempo_outlier', label: 'Tempo ratio outside benchmark band',
    severity: 'info', evidence: `Tempo ${tempo.toFixed(2)} (target 2.5–3.2)`,
  });

  if (lead < 65) physical.push({
    id: 'lead_leg_force_deficit', label: 'Lead-leg force production deficit', severity: 'warn',
  });
  if (cop < 0.6) physical.push({
    id: 'balance_deficit', label: 'Balance / postural control deficit', severity: 'info',
  });
  if (tempo > 3.8) physical.push({
    id: 'reactive_strength_deficit', label: 'Reactive strength deficit (slow downswing)', severity: 'info',
  });

  // Programming
  if (technical.find((t) => t.id === 'poor_lead_loading')) programming.push(tag('lead_leg_force', 'Lead-Leg Force'));
  if (technical.find((t) => t.id === 'late_pressure_transfer')) programming.push(tag('rotational_med_ball', 'Rotational Med Ball'));
  if (technical.find((t) => t.id === 'inconsistent_sequencing')) programming.push(tag('balance', 'Balance'));
  if (technical.find((t) => t.id === 'tempo_outlier')) programming.push(tag('reactive_strength', 'Reactive Strength'));
  if (physical.find((p) => p.id === 'balance_deficit')) programming.push(tag('anti_rotation', 'Anti-Rotation'));
  programming.push(tag('thoracic_mobility', 'Thoracic Mobility', 'info'));
  programming.push(tag('hip_mobility', 'Hip Mobility', 'info'));

  return { technical, physical, programming };
}

function tag(id: string, label: string, severity: Finding['severity'] = 'good'): Finding {
  return { id, label, severity };
}
