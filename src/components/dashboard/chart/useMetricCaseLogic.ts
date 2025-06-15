
import { TestData } from "@/types/forcePlateTypes";

export const metricCaseLogic = (
  test: TestData,
  testName?: string,
  metricType?: string
): { value: number | null; yAxisLabel: string } => {
  if (!testName || !metricType) return { value: null, yAxisLabel: "Peak Force (N)" };

  let value: number | undefined | null;
  let yAxisLabel = metricType;
  const pick = (keys: string[]) =>
    keys.find(k => (test.metrics as any)?.[k] !== undefined) ?
      (test.metrics as any)[keys.find(k => (test.metrics as any)?.[k] !== undefined) as string] : null;

  switch (testName) {
    case "Drop Jump":
      if (metricType === "Jump Height (cm)") value = pick(["jump_height_ft", "jump_height"]);
      if (metricType === "Contact Time") value = pick(["contact_time", "avg_contact_time"]);
      if (metricType === "Reactive Strength Index") value = pick(["rsi", "avg_rsi"]);
      if (metricType === "Flight Time") value = pick(["flight_time", "avg_flight_time"]);
      break;
    case "Countermovement Jump":
      if (metricType === "Jump Height (cm)") value = pick(["jump_height_ft", "jump_height"]);
      if (metricType === "Peak Power") value = pick(["peak_power"]);
      if (metricType === "Relative Peak Power") {
        const peak_power = pick(["peak_power"]);
        const body_mass = pick(["body_mass"]);
        if (
          peak_power !== null &&
          body_mass !== null &&
          !isNaN(Number(peak_power)) &&
          !isNaN(Number(body_mass)) &&
          Number(body_mass) !== 0
        ) {
          value = Number(peak_power) / Number(body_mass);
        } else {
          value = null;
        }
        yAxisLabel = "Relative Peak Power (W/kg)";
      }
      if (metricType === "Reactive Strength Index") value = pick(["rsi", "avg_rsi"]);
      break;
    case "Squat Jump":
      if (metricType === "Jump Height (cm)") value = pick(["jump_height_ft", "jump_height"]);
      if (metricType === "Take-off Velocity") value = pick(["takeoff_velocity", "peak_velocity"]);
      if (metricType === "Average Rate of Force Development") value = pick(["avg_rfd", "rate_of_force_development", "rfd_max"]);
      if (metricType === "Average Propulsive Power") value = pick(["avg_propulsive_power", "avg_power"]);
      break;
    case "Pogo Jump":
      if (metricType === "Jump Height (cm)" || metricType === "Jump Height (Pogo)") value = pick(["jump_height", "avg_jump_height"]);
      if (metricType === "Power") value = pick(["power", "avg_power"]);
      if (metricType === "Flight Time") value = pick(["flight_time", "avg_flight_time"]);
      if (metricType === "Reactive Strength Index") value = pick(["rsi", "avg_rsi"]);
      break;
    default:
      if (metricType === "Maximum Rate of Force Development") value = pick(["rfd_max", "avg_rfd"]);
      if (metricType === "Force at Max Rate of Force Development") value = pick(["force_150ms", "force_100ms", "force_50ms", "force_peak"]);
      if (metricType === "Peak Force" || metricType === "ISO Peak Force") value = pick(["peak_force", "force_peak"]);
      break;
  }

  if (value !== undefined && value !== null && !isNaN(Number(value))) {
    return { value: Number(value), yAxisLabel };
  }
  return { value: null, yAxisLabel };
};
