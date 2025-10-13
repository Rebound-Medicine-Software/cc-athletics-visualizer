
import { TestData } from "@/types/forcePlateTypes";

// Extracted helper to generate metric type options based on test name
export function getMetricTypesForTest(testName: string): string[] {
  switch (testName) {
    case "Drop Jump":
      return ["Jump Height (cm)", "Flight Time (ms)", "Reactive Strength Index (RSI)", "Contact Time (ms)"];
    case "Countermovement Jump":
      return ["Jump Height (cm)", "Peak Power (W)", "Relative Peak Power (W/kg)", "Reactive Strength Index (RSI)"];
    case "Squat Jump":
      return ["Jump Height (cm)", "Take-off Velocity (m/s)", "Average Rate of Force Development (W)", "Average Propulsive Power (W)"];
    case "Pogo Jump":
      return ["Jump Height (cm)", "Power (W)", "Flight Time (ms)", "Reactive Strength Index (RSI)"];
    default:
      return ["Maximum Rate of Force Development", "Force at Max Rate of Force Development", "Peak Force"];
  }
}

// Unique filtering helpers

export function getUniqueTestNames(data: TestData[]) {
  // Remove 'All Tests' and 'Isometric Test'
  return Array.from(new Set(data.map(d => d.test_name)))
    .filter(test => test !== "All Tests" && test !== "Isometric Test");
}

export function getUniqueAthleteNames(data: TestData[]) {
  return Array.from(new Set(data.map(d => d.athlete_name)));
}

export function getUniqueTestDates(data: TestData[]) {
  return Array.from(new Set(data.map(d => d.test_date))).sort();
}
