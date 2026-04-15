
import { TestData } from "@/types/forcePlateTypes";

// CASE statement logic, with config for metric keys and display
export const getCardConfigs = (testName?: string) => {
  if (!testName) {
    return [
      { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "" },
      { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "" },
      { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "" },
      { icon: "⏱️", title: "Select Test Name", metricKey: "", unit: "" }
    ];
  }
  switch (testName) {
    case "Countermovement Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Peak Power", metricKey: "peak_power", unit: "W" },
        { icon: "⚡", title: "Peak Power / Body Mass", metricKey: "relative_peak_power", unit: "W/kg" },
        { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
      ];
    case "Squat Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Take-off Velocity", metricKey: "takeoff_velocity", unit: "m/s" },
        { icon: "⚡", title: "Avg Rate of Force Dev.", metricKey: "avg_rfd", unit: "N/s" },
        { icon: "⚡", title: "Avg Propulsive Power", metricKey: "avg_propulsive_power", unit: "W" },
      ];
    case "Drop Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⏱️", title: "Flight Time", metricKey: "flight_time", unit: "ms" },
        { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
        { icon: "⏱️", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
      ];
    case "Pogo Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "RSI", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
        { icon: "⚡", title: "mRSI", metricKey: "avg_modified_rsi", fallbackKeys: ["modified_rsi", "rsi_modified"], unit: "m/s" },
        { icon: "⚡", title: "Power", metricKey: "avg_power", fallbackKeys: ["power", "avg_pogo_power"], unit: "W" },
        { icon: "⏱️", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
        { icon: "⏱️", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
      ];
    case "Left Side Pogo Jump":
    case "Right Side Pogo Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "RSI", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
        { icon: "⚡", title: "Power", metricKey: "avg_power", fallbackKeys: ["power", "avg_pogo_power"], unit: "W" },
        { icon: "⏱️", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
      ];
    default:
      return [
        { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
        { icon: "📈", title: "RFD Max", metricKey: "rfd_max", unit: "N/s" },
        { icon: "⚡", title: "Impulse 50ms", metricKey: "impulse_50ms", unit: "N·s" },
        { icon: "⚡", title: "Impulse 250ms", metricKey: "impulse_250ms", unit: "N·s" },
      ];
  }
};

// Which metrics are "lower is better"
export const lowerIsBetterMetrics = [
  "contact_time",
  "time_to_peak_force",
  "braking_duration",
  "force_time_to_peak",
  "avg_contact_time",
];

// Utilities to determine lower is better for a metric key
export const isLowerBetter = (metricKey: string) =>
  lowerIsBetterMetrics.includes(metricKey);
