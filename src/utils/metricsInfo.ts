
/**
 * Map metric display names or keys to info about whether "lower" is better.
 */
export const metricImprovementDirection: Record<string, "higher" | "lower"> = {
  // Common jumps/force metrics
  "Jump Height (cm)": "higher",
  "Peak Power": "higher",
  "Relative Peak Power": "higher",
  "Flight Time": "higher",
  "Peak Force": "higher",
  "RSI": "higher",
  "Reactive Strength Index": "higher",
  "Jump Height": "higher",

  // Lower is better
  "Contact Time": "lower",
  "Time to Peak Force": "lower",
  "Take-off Velocity": "higher",
  "Average Propulsive Power": "higher",
  "Average Rate of Force Development": "higher",

  // Default
};

// Helper to get direction; default "higher"
export function getImprovementDirection(metric: string): "higher" | "lower" {
  return metricImprovementDirection[metric] || "higher";
}
