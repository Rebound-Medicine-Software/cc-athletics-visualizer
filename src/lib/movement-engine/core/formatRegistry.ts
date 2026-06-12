import type { FormatDetector } from './types';

export function detectFormat(
  text: string,
  filename: string | undefined,
  detectors: FormatDetector[],
): FormatDetector | undefined {
  return detectors.find((d) => {
    try { return d.matches(text, filename); } catch { return false; }
  });
}
