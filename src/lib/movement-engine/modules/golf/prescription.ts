// Curated coach-tag catalogue for golf. UI persists selected tags to
// test_data.metrics.golf.coach_tags.
export interface CoachTag { id: string; label: string; polarity: 'positive' | 'negative' | 'neutral'; }

export const GOLF_COACH_TAGS: CoachTag[] = [
  { id: 'early_extension',        label: 'Early Extension',         polarity: 'negative' },
  { id: 'poor_transition',        label: 'Poor Transition',         polarity: 'negative' },
  { id: 'excessive_sway',         label: 'Excessive Sway',          polarity: 'negative' },
  { id: 'loss_of_posture',        label: 'Loss of Posture',         polarity: 'negative' },
  { id: 'poor_lead_loading',      label: 'Poor Lead Loading',       polarity: 'negative' },
  { id: 'good_pressure_transfer', label: 'Good Pressure Transfer',  polarity: 'positive' },
  { id: 'excellent_sequencing',   label: 'Excellent Sequencing',    polarity: 'positive' },
  { id: 'strong_lead_post_up',    label: 'Strong Lead Post-Up',     polarity: 'positive' },
  { id: 'slide_no_rotation',      label: 'Slide w/o Rotation',      polarity: 'negative' },
  { id: 'over_rotation',          label: 'Over-Rotation',           polarity: 'negative' },
];
