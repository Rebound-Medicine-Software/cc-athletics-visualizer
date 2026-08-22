
import { TestData } from "@/types/forcePlateTypes";

// Extracted helper to generate metric type options based on test name
export function getMetricTypesForTest(testName: string): string[] {
  switch (testName) {
    case "Drop Jump":
      return ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"];
    case "Countermovement Jump":
      return ["Jump Height (cm)", "Peak Power", "Relative Peak Power", "Reactive Strength Index"];
    case "Squat Jump":
      return ["Jump Height (cm)", "Take-off Velocity", "Average Rate of Force Development", "Average Propulsive Power"];
    case "Pogo Jump":
      return ["Jump Height (cm)", "Power", "Flight Time", "Reactive Strength Index"];
    case "Left Side Pogo Jump":
    case "Right Side Pogo Jump":
      return ["Jump Height (cm)", "Power", "Flight Time", "Contact Time", "Reactive Strength Index"];
    case "Left Side Countermovement Jump":
    case "Right Side Countermovement Jump":
      return ["Jump Height (cm)", "Peak Propulsive Power", "Relative Peak Power", "Reactive Strength Index"];
    case "Left Side Squat Jump":
    case "Right Side Squat Jump":
      return ["Jump Height (cm)", "Peak Landing Force", "Ground Contact Time (s)", "Reactive Strength Index"];
    case "Single Leg Drop Jump":
    case "Left Side Drop Jump":
    case "Right Side Drop Jump":
      return ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"];
    case "Standing Long Jump":
    case "Horizontal Jump":
      return ["Peak Takeoff Force", "Flight Time", "Peak Landing Force", "Takeoff Velocity"];
    case "Single Leg Hop for Distance":
      return ["Peak Takeoff Force", "Contact Time", "Peak Landing Force", "Reactive Strength Index"];
    case "Hop Test":
      return ["RSI (m/s)", "Contact Time", "Flight Time", "Jump Height (cm)"];
    case "Single Leg Hop Test":
      return ["RSI (m/s)", "Contact Time", "Flight Time", "Jump Height (cm)"];
    case "Single Leg Jump":
      return ["RSI (m/s)", "Jump Height (cm)", "Contact Time", "Flight Time"];
    case "Single Leg Drop Jump":
      return ["Jump Height (cm)", "RSI (m/s)", "Contact Time", "Flight Time"];
    case "Shoulder ISO-Y":
      return ["Peak Force", "RFD Max", "Force @ 50ms", "Force @ 200ms"];
    case "Isometric Shoulder Y-test":
    case "Isometric Mid-Thigh Pull":
    case "Isometric Squat":
    case "Isometric Push":
      return ["Peak Force", "RFD Max", "Impulse @ 50ms", "Impulse @ 250ms"];
    default:
      // Left/Right Side isometric tests (e.g. "Left Side IMTP")
      if (testName.startsWith("Left Side") || testName.startsWith("Right Side")) {
        return ["Early Force Capacity", "Moderate/Late Force Capacity", "Peak Force", "Stable Force Reading"];
      }
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
