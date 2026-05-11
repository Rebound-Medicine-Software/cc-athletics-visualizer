/**
 * Athlete-facing metric interpretation.
 *
 * Translates raw force-plate / strength metrics into plain-English ratings
 * and short, non-clinical, non-causal explanations.
 *
 * Rules:
 *  - Simple language only
 *  - No medical claims
 *  - No causal claims ("may help", "is developing", "shows" only)
 *  - Confidence wording, not diagnosis
 *
 * Bands are deliberately loose — they exist to give athletes a feel for
 * "where they sit", not to replace the practitioner's expertise.
 */

export type Tier = 'excellent' | 'good' | 'developing' | 'needs_focus' | 'unknown';

export interface MetricInterpretation {
  /** Friendly title shown to athlete */
  title: string;
  /** Short subtitle / category */
  category: string;
  /** Raw value formatted with unit */
  display: string;
  /** Plain-English rating */
  ratingLabel: string;
  /** Tier for colouring */
  tier: Tier;
  /** Single-sentence interpretation (no causal claims) */
  explanation: string;
  /** Short coaching focus suggestion */
  focusSuggestion: string;
}

export interface MetricBand {
  testName: string;
  metricKey: string;
  title: string;
  category: string;
  unit: string;
  higherIsBetter: boolean;
  /** value thresholds, ordered from worst to best for higherIsBetter */
  thresholds: { needs_focus: number; developing: number; good: number; excellent: number };
  copy: Record<Tier, { rating: string; explanation: string; focus: string }>;
}

const BANDS: MetricBand[] = [
  {
    testName: 'Countermovement Jump',
    metricKey: 'jump_height_ft',
    title: 'Jump Performance',
    category: 'Lower-body Power',
    unit: 'cm',
    higherIsBetter: true,
    thresholds: { needs_focus: 20, developing: 28, good: 36, excellent: 45 },
    copy: {
      excellent: {
        rating: 'Elite for your level',
        explanation: 'Your lower-body power output is in the top tier we typically see.',
        focus: 'Maintain through quality strength work and recovery.',
      },
      good: {
        rating: 'Above average for your level',
        explanation: 'Your lower-body power is developing well.',
        focus: 'Continue current training emphasis.',
      },
      developing: {
        rating: 'On track',
        explanation: 'Your jump output is around what we expect at this stage.',
        focus: 'Targeted plyometric work could nudge this upward.',
      },
      needs_focus: {
        rating: 'A focus area',
        explanation: 'Your jump output sits below where we’d like it.',
        focus: 'Building lower-body strength may improve this over time.',
      },
      unknown: { rating: 'Not enough data', explanation: 'We need more tests to interpret this.', focus: '' },
    },
  },
  {
    testName: 'Countermovement Jump',
    metricKey: 'rsi',
    title: 'Explosiveness',
    category: 'Reactive Strength',
    unit: '',
    higherIsBetter: true,
    thresholds: { needs_focus: 0.3, developing: 0.45, good: 0.6, excellent: 0.8 },
    copy: {
      excellent: {
        rating: 'Highly explosive',
        explanation: 'You generate force very quickly.',
        focus: 'Keep a small dose of plyometrics weekly to maintain.',
      },
      good: {
        rating: 'Good reactive power',
        explanation: 'You rebound quickly off the floor.',
        focus: 'Continue current reactive work.',
      },
      developing: {
        rating: 'Developing',
        explanation: 'Your reactive strength is building.',
        focus: 'More short-contact plyometrics could help over time.',
      },
      needs_focus: {
        rating: 'A focus area',
        explanation: 'Your reactive strength has room to grow.',
        focus: 'Coach may prioritise short, snappy jump work.',
      },
      unknown: { rating: 'Not enough data', explanation: 'We need more tests to interpret this.', focus: '' },
    },
  },
  {
    testName: 'Isometric Mid-Thigh Pull (IMTP)',
    metricKey: 'force_peak',
    title: 'Strength Output',
    category: 'Maximal Force',
    unit: 'N',
    higherIsBetter: true,
    thresholds: { needs_focus: 1500, developing: 2200, good: 3000, excellent: 3800 },
    copy: {
      excellent: {
        rating: 'Very strong',
        explanation: 'Your maximal force production is excellent.',
        focus: 'Maintain with quality strength sessions.',
      },
      good: {
        rating: 'Strong',
        explanation: 'Your maximal force is above average.',
        focus: 'Continue current strength phase.',
      },
      developing: {
        rating: 'Developing',
        explanation: 'Your maximal force is in a typical range.',
        focus: 'Consistent strength training may move this upward.',
      },
      needs_focus: {
        rating: 'Needs improvement',
        explanation: 'Your maximal force has room to grow.',
        focus: 'Building maximal force may improve overall performance.',
      },
      unknown: { rating: 'Not enough data', explanation: 'We need more tests to interpret this.', focus: '' },
    },
  },
  {
    testName: 'Pogo Jump',
    metricKey: 'avg_rsi',
    title: 'Spring Stiffness',
    category: 'Lower-leg Reactivity',
    unit: '',
    higherIsBetter: true,
    thresholds: { needs_focus: 1.0, developing: 1.5, good: 2.2, excellent: 3.0 },
    copy: {
      excellent: {
        rating: 'Excellent spring',
        explanation: 'Your lower legs return energy very efficiently.',
        focus: 'Maintain with regular pogo and skipping work.',
      },
      good: {
        rating: 'Good reactive bounce',
        explanation: 'Your lower-leg stiffness is well developed.',
        focus: 'Continue current reactive training.',
      },
      developing: {
        rating: 'Developing',
        explanation: 'Your lower-leg stiffness is building.',
        focus: 'Pogo and short-contact work may help over time.',
      },
      needs_focus: {
        rating: 'A focus area',
        explanation: 'Your lower-leg stiffness has room to grow.',
        focus: 'Building tendon stiffness gradually may help.',
      },
      unknown: { rating: 'Not enough data', explanation: 'We need more tests to interpret this.', focus: '' },
    },
  },
];

const tierFor = (value: number, band: MetricBand): Tier => {
  const t = band.thresholds;
  if (band.higherIsBetter) {
    if (value >= t.excellent) return 'excellent';
    if (value >= t.good) return 'good';
    if (value >= t.developing) return 'developing';
    return 'needs_focus';
  }
  if (value <= t.needs_focus) return 'excellent';
  if (value <= t.developing) return 'good';
  if (value <= t.good) return 'developing';
  return 'needs_focus';
};

export const interpretMetric = (params: {
  testName: string;
  metricKey: string;
  value: number | null | undefined;
}): MetricInterpretation | null => {
  const band = BANDS.find(
    (b) => b.testName === params.testName && b.metricKey === params.metricKey,
  );
  if (!band) return null;
  if (params.value == null || !Number.isFinite(params.value)) {
    const c = band.copy.unknown;
    return {
      title: band.title,
      category: band.category,
      display: '—',
      ratingLabel: c.rating,
      tier: 'unknown',
      explanation: c.explanation,
      focusSuggestion: c.focus,
    };
  }
  const tier = tierFor(params.value, band);
  const c = band.copy[tier];
  return {
    title: band.title,
    category: band.category,
    display: `${params.value.toFixed(band.unit === 'N' ? 0 : 2)}${band.unit ? ' ' + band.unit : ''}`,
    ratingLabel: c.rating,
    tier,
    explanation: c.explanation,
    focusSuggestion: c.focus,
  };
};

/** Tailwind-safe tier styling for athlete cards. */
export const tierStyles: Record<Tier, { badge: string; ring: string; text: string }> = {
  excellent: { badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', ring: 'ring-emerald-500/30', text: 'text-emerald-600' },
  good:      { badge: 'bg-sky-500/15 text-sky-700 border-sky-500/30',           ring: 'ring-sky-500/30',     text: 'text-sky-600' },
  developing:{ badge: 'bg-amber-500/15 text-amber-700 border-amber-500/30',     ring: 'ring-amber-500/30',   text: 'text-amber-600' },
  needs_focus:{badge: 'bg-rose-500/15 text-rose-700 border-rose-500/30',         ring: 'ring-rose-500/30',    text: 'text-rose-600' },
  unknown:   { badge: 'bg-muted text-muted-foreground border-border',            ring: 'ring-border',         text: 'text-muted-foreground' },
};

export const KNOWN_METRIC_KEYS = BANDS.map((b) => ({ testName: b.testName, metricKey: b.metricKey }));
