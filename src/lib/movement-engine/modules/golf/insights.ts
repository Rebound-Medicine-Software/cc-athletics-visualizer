import type { GolfKpis, GolfKpiScores } from './kpis';
import { scoreGolfKpis } from './kpis';

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

// ---------------------------------------------------------------------------
// Athlete-facing narrative — plain-English Q&A matched to KPI weaknesses
// ---------------------------------------------------------------------------

export interface NarrativeItem {
  icon:     string;
  question: string;
  answer:   string;
}

export interface GolfNarrative {
  headline: string;
  items:    NarrativeItem[];
  overall:  number; // 0-100
}

/**
 * Builds an athlete-friendly narrative from a list of swing KPIs.
 * Uses the average across all swings so the message represents the full session.
 */
export function buildGolfNarrative(kpisList: GolfKpis[]): GolfNarrative {
  if (!kpisList.length) {
    return { headline: 'Upload a session to see your personalised insights.', items: [], overall: 0 };
  }

  const avg = (k: keyof GolfKpis) =>
    kpisList.reduce((a, b) => a + (b[k] as number), 0) / kpisList.length;

  const avgKpis: GolfKpis = {
    peak_force:         avg('peak_force'),
    lead_load_pct:      avg('lead_load_pct'),
    trail_load_pct:     avg('trail_load_pct'),
    weight_transfer_pct: avg('weight_transfer_pct'),
    tempo_ratio:        avg('tempo_ratio'),
    cop_quality:        avg('cop_quality'),
    transition_ms:      avg('transition_ms'),
    peak_impact_force:  avg('peak_impact_force'),
    cop_efficiency:     avg('cop_efficiency'),
  };

  const scores: GolfKpiScores = scoreGolfKpis(avgKpis);
  const items: NarrativeItem[] = [];

  if (scores.lead_load < 58) {
    items.push({
      icon: '⚡',
      question: 'Why am I losing distance?',
      answer:
        `Your lead side is only absorbing ${avgKpis.lead_load_pct.toFixed(0)}% of your weight at impact — ` +
        `the target is 75%+. This means you're not driving through the ball; you're flipping at it instead. ` +
        `Lead-leg strength and "feel the ground push back" drills will unlock extra metres.`,
    });
  }

  if (scores.weight_transfer < 58) {
    items.push({
      icon: '🔄',
      question: 'Why do I slice or come over the top?',
      answer:
        `Your pressure only shifted ${avgKpis.weight_transfer_pct.toFixed(0)}% from trail to lead during the swing ` +
        `(target: 20%+). Without that ground-force transfer your upper body compensates — creating the over-the-top ` +
        `move that causes slices and pulls. Rotational power work and pressure-shift drills are the fix.`,
    });
  }

  if (scores.tempo < 58) {
    const desc = avgKpis.tempo_ratio < 2.5 ? 'rushing your backswing' : 'swinging too slowly';
    items.push({
      icon: '🎵',
      question: 'Why is my timing off?',
      answer:
        `Your tempo ratio is ${avgKpis.tempo_ratio.toFixed(2)} — the ideal is 2.5–3.2. You're ${desc}. ` +
        `A good swing takes roughly 3× longer on the way up than the way down. ` +
        `Try counting "one-two-three" on the backswing and "one" on the downswing until it becomes automatic.`,
    });
  }

  if (scores.transition < 58) {
    items.push({
      icon: '💥',
      question: 'Why do I lack pop at impact?',
      answer:
        `Your downswing acceleration starts ${avgKpis.transition_ms.toFixed(0)} ms after the top ` +
        `(target: ≤180 ms). That lag means you run out of room to build clubhead speed. ` +
        `Reactive strength drills — explosive hip hinges, jump squats — train the fast-twitch fibres that fire this.`,
    });
  }

  if (scores.cop_quality < 58) {
    items.push({
      icon: '⚖️',
      question: 'Why am I inconsistent shot to shot?',
      answer:
        `Your centre of pressure path shows instability through impact (${avgKpis.cop_efficiency.toFixed(0)}% score). ` +
        `Balance is breaking down at the exact moment you need it most. ` +
        `Single-leg balance and proprioception exercises will make your base rock-solid.`,
    });
  }

  if (items.length === 0) {
    items.push({
      icon: '✅',
      question: 'What\'s working well?',
      answer:
        'Your ground-force metrics are solid across the board. Keep reinforcing these patterns with ' +
        'consistent practice, and look at your CoP and benchmark panels for fine-tuning opportunities.',
    });
  }

  const o = scores.overall;
  const headline =
    o >= 80
      ? `Excellent mechanics — your swing is ${o}% efficient. You're generating force the way the data wants to see.`
      : o >= 58
      ? `Solid foundations with clear opportunities to unlock more distance — ${o}% efficient. The data shows exactly where.`
      : `Your swing has significant room for improvement right now — ${o}% efficient. The good news: the data shows exactly what to fix.`;

  return { headline, items, overall: o };
}
