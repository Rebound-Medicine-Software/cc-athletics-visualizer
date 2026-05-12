import { canonicalSport } from './normalize';

const MIN_SAMPLE = 10;

/**
 * Returns a short, athlete-friendly comparison-context label based on
 * the athlete's tagged sports. Falls back gracefully when no sport tags
 * are present so we never imply false precision.
 *
 * Examples:
 *   ["MMA"]           -> "Compared with MMA athletes"
 *   ["100m","Sprint"] -> "Compared with 100m and sprint athletes"
 *   []                -> "Compared with all athletes in your club"
 */
export const sportComparisonLabel = (
  sports: string[] | null | undefined,
  fallback = 'Compared with all athletes in your club',
): string => {
  const canon = (sports ?? [])
    .map((s) => canonicalSport(s))
    .filter(Boolean);
  if (canon.length === 0) return fallback;
  if (canon.length === 1) return `Compared with ${canon[0]} athletes`;
  if (canon.length === 2) return `Compared with ${canon[0]} and ${canon[1]} athletes`;
  return `Compared with ${canon.slice(0, -1).join(', ')} and ${canon.slice(-1)[0]} athletes`;
};

/**
 * Decides whether a sport-specific comparison should be shown given the
 * pool size. Anything below MIN_SAMPLE falls back to the broader scope.
 */
export const sportPoolReady = (poolSize: number) => poolSize >= MIN_SAMPLE;

export const SPORT_MIN_SAMPLE = MIN_SAMPLE;
