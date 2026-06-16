/**
 * FreeModeBattery — wraps the existing PerformanceDataExplorer.
 * No gating, no fixed protocol — pick any test, any athlete.
 */
import { PerformanceDataExplorer } from '@/components/dashboard/performance-data/PerformanceDataExplorer';

export function FreeModeBattery() {
  return <PerformanceDataExplorer />;
}
