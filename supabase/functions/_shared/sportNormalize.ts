/**
 * Sport normalisation for Supabase Edge Functions (Deno runtime).
 *
 * This is a deliberate, minimal port of `src/lib/sports/normalize.ts`'s
 * `canonicalSport()` matching logic -- edge functions run in a separate
 * Deno isolate and can't import from the Vite/React `src/` tree, so the
 * alias table is duplicated here rather than shared. Keep `SPORT_ALIASES`
 * in sync with the frontend copy if aliases change; only the pieces an
 * edge function actually needs (canonicalSport) are ported, not the full
 * frontend module (UI-only helpers like SPORT_BUNDLES stay out).
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
 * Falls back to a trimmed version of the input when unknown.
 */
export const canonicalSport = (raw?: string | null): string => {
    if (!raw) return '';
    const key = raw.trim().toLowerCase();
    if (!key) return '';
    return ALIAS_TO_CANONICAL.get(key) ?? raw.trim();
};
