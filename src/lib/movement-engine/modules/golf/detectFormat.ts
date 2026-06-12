import type { FormatDetector } from '../../core/types';

/**
 * Format detectors for golf-swing force-plate exports.
 * Generic detector is the fallback so any header-only/comma CSV is still parsable.
 */
export const golfFormats: FormatDetector[] = [
  {
    id: 'forcemate',
    label: 'ForceMate',
    matches: (txt) => /forcemate/i.test(txt),
  },
  {
    id: 'cc_athletics',
    label: 'CC Athletics',
    matches: (txt) => /cc\s*athletics|forcedecks/i.test(txt),
  },
  {
    id: 'swing_catalyst',
    label: 'Swing Catalyst',
    matches: (txt) => /swing\s*catalyst/i.test(txt),
  },
  {
    id: 'smart2move',
    label: 'Smart2Move',
    matches: (txt) => /smart2move/i.test(txt),
  },
  {
    id: 'generic',
    label: 'Generic Force Plate',
    matches: () => true,
  },
];
