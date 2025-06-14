
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { TestData } from "@/types/forcePlateTypes";

export interface MetricCardsProps {
  selectedTest: string;
  selectedAthlete: string;
  metricType: string;
  data: TestData[];
}

const IMPROVEMENT_METRICS = [
  "Contact Time", "Flight Time", "Time to Peak Force", "Avg Contact Time"
];

const isLowerIsBetter = (metricType: string) =>
  IMPROVEMENT_METRICS.some(m => metricType?.toLowerCase().includes(m.toLowerCase()));

export const MetricCards = ({
  selectedTest,
  selectedAthlete,
  metricType,
  data,
}: MetricCardsProps) => {
  // Filter for athlete+test
  const filteredData = data.filter(
    d => d.athlete_name === selectedAthlete && d.test_name === selectedTest
  );

  // Metric key based on case logic - partial (this can be expanded)
  const metricKeyMap = (test: string, metric: string) => {
    switch (test) {
      case "Drop Jump":
        if (metric === "Jump Height (cm)") return "jump_height";
        if (metric === "Contact Time") return "contact_time";
        if (metric === "Reactive Strength Index") return "rsi";
        if (metric === "Flight Time") return "flight_time";
        break;
      case "Countermovement Jump":
        if (metric === "Jump Height (cm)") return "jump_height";
        if (metric === "Peak Power") return "peak_power";
        if (metric === "Relative Peak Power") return "avg_propulsive_power";
        if (metric === "Reactive Strength Index") return "rsi";
        break;
      case "Squat Jump":
        if (metric === "Jump Height (cm)") return "jump_height";
        if (metric === "Take-off Velocity") return "takeoff_velocity";
        if (metric === "Average Rate of Force Development") return "avg_rfd";
        if (metric === "Average Propulsive Power") return "avg_propulsive_power";
        break;
      case "Pogo Jump":
        if (metric === "Jump Height (cm)") return "jump_height";
        if (metric === "Power") return "power";
        if (metric === "Flight Time") return "flight_time";
        if (metric === "Reactive Strength Index") return "rsi";
        break;
      default:
        if (metric === "Maximum Rate of Force Development") return "rfd_max";
        if (metric === "Force at Max Rate of Force Development") return "force_150ms";
        if (metric === "Peak Force" || metric === "ISO Peak Force") return "peak_force";
    }
    return undefined;
  };

  const metricKey = metricKeyMap(selectedTest, metricType);

  // Find Values
  let allValues: number[] = [];
  filteredData.forEach(d => {
    if (!metricKey) return;
    const val = d.metrics && (d.metrics as any)[metricKey];
    if (typeof val === "number" && !isNaN(val)) allValues.push(val);
  });

  const allTimeBest = (() => {
    if (allValues.length === 0) return null;
    if (isLowerIsBetter(metricType)) {
      return Math.min(...allValues);
    }
    return Math.max(...allValues);
  })();

  // Most recent = latest test_date
  const mostRecent = (() => {
    let recent: { date: string; value: number } | null = null;
    filteredData.forEach(d => {
      if (!metricKey) return;
      const v = d.metrics && (d.metrics as any)[metricKey];
      if (typeof v !== "number" || isNaN(v)) return;
      if (
        !recent ||
        new Date(d.test_date) > new Date(recent.date)
      ) {
        recent = { date: d.test_date, value: v };
      }
    });
    return recent ? recent.value : null;
  })();

  // % comparison - show improvement in green (down if lower-better, up if higher-better)
  const computePercent = (recent: number | null, best: number | null) => {
    if (recent == null || best == null || best === 0) return null;
    let percent: number;
    if (isLowerIsBetter(metricType)) {
      percent = ((best - recent) / best) * 100;
    } else {
      percent = ((recent - best) / best) * 100;
    }
    return percent;
  };

  const percent = computePercent(mostRecent, allTimeBest);

  // Format arrow + color logic
  let direction: "positive" | "negative" | null = null;
  if (percent !== null) {
    if (isLowerIsBetter(metricType)) {
      direction = percent > 0 ? "positive" : percent < 0 ? "negative" : null;
    } else {
      direction = percent > 0 ? "positive" : percent < 0 ? "negative" : null;
    }
  }

  // Card display
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 text-center">
          <div className="text-xs text-gray-500 mb-2">{metricType || "Metric"}</div>
          <div className="text-2xl font-bold text-gray-800 mb-2">
            {mostRecent !== null ? mostRecent.toFixed(2) : "N/A"}
          </div>
          <div className="flex items-center justify-center mb-2 space-x-1">
            {percent !== null && direction === "positive" ? (
              <ArrowUpRight className="w-4 h-4 text-green-500 inline" />
            ) : percent !== null && direction === "negative" ? (
              <ArrowDownRight className="w-4 h-4 text-red-500 inline" />
            ) : null}
            {percent !== null && (
              <span className={`text-sm font-medium ${direction === "positive" ? "text-green-700" : direction === "negative" ? "text-red-500" : "text-gray-600"}`}>
                {Math.abs(percent).toFixed(1)}% {direction === "positive"
                  ? "improvement"
                  : direction === "negative"
                  ? "decline"
                  : ""}
              </span>
            )}
          </div>
          <div className="text-gray-400 text-xs mt-2">
            Best: <span className="font-semibold">{allTimeBest !== null ? allTimeBest.toFixed(2) : "N/A"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
