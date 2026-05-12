/**
 * Sports normalisation layer (non-destructive).
 *
 * Maps free-text sport/event labels onto canonical names so that future
 * filters, rankings, and comparative analytics aggregate consistently —
 * without mutating what the user typed in `athletes.sports`.
 *
 * Add new aliases below; canonical name is the map key.
 */

export const SPORT_ALIASES: Record<string, string[]> = {
  MMA: ['mma', 'mixed martial arts', 'mixed-martial-arts'],
  BJJ: ['bjj', 'brazilian jiu jitsu', 'brazilian jiu-jitsu', 'jiu jitsu', 'jiujitsu'],
  Wrestling: ['wrestling', 'freestyle wrestling', 'greco-roman'],
  Kickboxing: ['kickboxing', 'kick boxing', 'k1', 'k-1'],
  Boxing: ['boxing'],
  Judo: ['judo'],
  Muay_Thai: ['muay thai', 'muaythai', 'thai boxing'],
  Football: ['football', 'soccer', 'association football'],
  Rugby: ['rugby', 'rugby union', 'rugby league'],
  Athletics: ['athletics', 'track and field', 'track & field'],
  '100m': ['100m', '100 m', '100 metres', '100 meters', '100m sprint', 'sprint 100m'],
  '200m': ['200m', '200 m', '200 metres', '200 meters'],
  '400m': ['400m', '400 m', '400 metres', '400 meters'],
  Hurdles: ['hurdles', '100m hurdles', '110m hurdles', '400m hurdles'],
  'Long Jump': ['long jump', 'longjump'],
  'High Jump': ['high jump', 'highjump'],
  Sprint: ['sprint', 'sprints', 'sprinting'],
  Endurance: ['endurance', 'long distance', 'distance running'],
  Strength: ['strength', 'strength training', 'strength & conditioning', 's&c'],
  Rehab: ['rehab', 'rehabilitation', 'return to play', 'rtp'],
};

// Build reverse lookup once: alias-lower -> canonical.
const ALIAS_TO_CANONICAL: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(SPORT_ALIASES)) {
    m.set(canonical.toLowerCase(), canonical);
    for (const a of aliases) m.set(a.toLowerCase(), canonical);
  }
  return m;
})();

/**
 * Returns the canonical sport name for a free-text label.
 * Falls back to a trimmed/title-cased version of the input when unknown.
 */
export const canonicalSport = (raw?: string | null): string => {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  if (!key) return '';
  return ALIAS_TO_CANONICAL.get(key) ?? raw.trim();
};

/** Canonicalise an array, dedupe, preserve order. */
export const canonicalSports = (raws?: string[] | null): string[] => {
  if (!raws?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raws) {
    const c = canonicalSport(r);
    if (!c) continue;
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
};

/** True if an athlete's sports list matches a canonical filter (case-insensitive). */
export const athleteMatchesSport = (
  athleteSports: string[] | null | undefined,
  canonicalFilter: string,
): boolean => {
  if (!canonicalFilter) return true;
  const target = canonicalSport(canonicalFilter).toLowerCase();
  if (!target) return true;
  return (athleteSports ?? []).some(
    (s) => canonicalSport(s).toLowerCase() === target,
  );
};

/** All known canonical names (alphabetical). */
export const ALL_CANONICAL_SPORTS: string[] = Object.keys(SPORT_ALIASES).sort(
  (a, b) => a.localeCompare(b),
);

/** Quick onboarding bundles for clubs. */
export const SPORT_BUNDLES: { label: string; sports: string[] }[] = [
  { label: 'MMA Class', sports: ['MMA', 'BJJ', 'Wrestling', 'Kickboxing'] },
  { label: 'BJJ Class', sports: ['BJJ'] },
  { label: 'Boxing Squad', sports: ['Boxing', 'Strength'] },
  { label: 'Sprint Squad', sports: ['100m', '200m', 'Sprint', 'Athletics'] },
  { label: 'Endurance Squad', sports: ['Endurance', 'Athletics'] },
  { label: 'Jumps Squad', sports: ['Long Jump', 'High Jump', 'Athletics'] },
  { label: 'Football Squad', sports: ['Football'] },
  { label: 'Rugby Squad', sports: ['Rugby'] },
];
