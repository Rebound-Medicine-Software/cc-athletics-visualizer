import { Card, CardContent } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";

// Define which metrics consider "lower is better"
const lowerIsBetterMetrics = [
  "contact_time",
  "time_to_peak_force",
  "braking_duration",
  "force_time_to_peak", // fallback for isos
  "avg_contact_time",
];

interface MetricCardsProps {
  selectedTest: string;
  data: TestData[];
}

// Utility to determine if lower is better for a metric key
const isLowerBetter = (metricKey: string) => {
  return lowerIsBetterMetrics.includes(metricKey);
};

// Compare function for best metric (returns best value based on metric)
const getBest = (arr: number[], metricKey: string): number | null => {
  if (arr.length === 0) return null;
  return isLowerBetter(metricKey) ? Math.min(...arr) : Math.max(...arr);
};

// Format arrow and color based on improvement
const getArrowInfo = (change: number, metricKey: string) => {
  if (change === null || change === undefined) return { arrow: "", color: "" };
  const better = isLowerBetter(metricKey) ? change > 0 : change > 0;
  return {
    arrow: change === 0 ? "" : (better ? "↑" : "↓"),
    color: change === 0
      ? "text-gray-500"
      : better
        ? "text-green-600"
        : "text-red-600",
  };
};

// Format value for display
const formatValue = (value: number | null | undefined, unit?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
};

export const MetricCards = ({ selectedTest, data }: MetricCardsProps) => {
  // Filter data by selected test
  const filteredData = selectedTest
    ? data.filter(d => d.test_name === selectedTest)
    : [];

  // Helper to get the recent and best value for a given metric
  const getMostRecent = (metricKey: string) => {
    if (filteredData.length === 0) return null;
    const sorted = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.test_date).getTime();
      const dateB = new Date(b.test_date).getTime();
      return dateB - dateA || (b.repetition_number - a.repetition_number);
    });
    const firstWithMetric = sorted.find(d => d.metrics && metricKey in d.metrics && typeof (d.metrics as any)[metricKey] === "number");
    if (firstWithMetric) {
      return (firstWithMetric.metrics as any)[metricKey];
    }
    return null;
  };

  const getAllValues = (metricKey: string) => {
    return filteredData
      .map(d => (d.metrics && (metricKey in d.metrics)) ? (d.metrics as any)[metricKey] : null)
      .filter(v => typeof v === "number" && !isNaN(v)) as number[];
  };

  // -- NEW METRICS CONFIG BASED ON INSTRUCTIONS --
  function getCardConfigs(testName?: string) {
    if (!testName || filteredData.length === 0) {
      return [
        { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined },
        { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined },
        { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined },
        { icon: "⏱️", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined }
      ];
    }

    switch (testName) {
      case "Countermovement Jump":
        return [
          // Card 1
          { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", unit: "cm", keyOverride: "jump_height_cm" }, // We'll convert from ft or use cm if available
          // Card 2
          { icon: "⚡", title: "Peak Power", metricKey: "peak_power", unit: "W" },
          // Card 3
          { icon: "⚡", title: "Peak Power / Body Mass", metricKey: "relative_peak_power", unit: "W/kg" }, // may need to compute
          // Card 4
          { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
        ];
      case "Squat Jump":
        return [
          { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", unit: "cm", keyOverride: "jump_height_cm" },
          { icon: "⚡", title: "Take-off Velocity", metricKey: "takeoff_velocity", unit: "m/s" },
          { icon: "⚡", title: "Avg Rate of Force Dev.", metricKey: "avg_rfd", unit: "N/s" },
          { icon: "⚡", title: "Avg Propulsive Power", metricKey: "avg_propulsive_power", unit: "W" },
        ];
      case "Drop Jump":
        return [
          { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", unit: "cm", keyOverride: "jump_height_cm" },
          { icon: "⏱️", title: "Flight Time", metricKey: "flight_time", unit: "ms" },
          { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
          { icon: "⏱️", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
        ];
      case "Pogo Jump":
        return [
          { icon: "📏", title: "Jump Height (Pogo)", metricKey: "avg_jump_height", unit: "m" },
          { icon: "⚡", title: "Reactive Strength Index", metricKey: "avg_rsi", unit: "" },
          { icon: "⚡", title: "Power", metricKey: "avg_power", unit: "W" },
          { icon: "⏱️", title: "Flight Time", metricKey: "avg_flight_time", unit: "ms" },
        ];
      default:
        // ISOMETRICS/OTHER
        return [
          { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
          { icon: "📈", title: "RFD Max", metricKey: "rfd_max", unit: "N/s" },
          { icon: "⚡", title: "Impulse 50ms", metricKey: "impulse_50ms", unit: "N·s" },
          { icon: "⚡", title: "Impulse 250ms", metricKey: "impulse_250ms", unit: "N·s" },
        ];
    }
  }

  // Helper to try to get value either from .jump_height_cm or convert ft to cm
  function resolveJumpHeight(metricObj: any, ftKey: string, cmKey: string) {
    if (metricObj && cmKey in metricObj && typeof metricObj[cmKey] === "number") {
      return metricObj[cmKey];
    } else if (metricObj && ftKey in metricObj && typeof metricObj[ftKey] === "number") {
      const feetVal = metricObj[ftKey];
      if (!isNaN(feetVal)) return feetVal * 30.48; // 1 ft = 30.48 cm
    }
    return null;
  }
  // For Countermovement Jump only: relative peak power = peak_power / body_mass
  function computeRelativePeakPower(metricsObj: any) {
    if (metricsObj && "peak_power" in metricsObj && "body_mass" in metricsObj) {
      const pp = metricsObj.peak_power;
      const bm = metricsObj.body_mass;
      if (typeof pp === "number" && typeof bm === "number" && bm !== 0) {
        return pp / bm;
      }
    }
    return null;
  }

  const cardConfigs = getCardConfigs(selectedTest);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cardConfigs.map((card, index) => {
        if (!card.metricKey) {
          // Empty state
          return (
            <Card key={index} className="bg-white shadow-md">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-xs text-gray-600 mb-2 h-8 flex items-center justify-center">
                  {card.title}
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  N/A
                </div>
                <div className="text-sm text-gray-500">No Data</div>
              </CardContent>
            </Card>
          );
        }
        // Try to fetch metric value, possibly with overrides or calculations:
        let mostRecentValue: number | null = null;
        let bestValue: number | null = null;
        // For the first card in relevant jumps, we might need to do jump_height conversion
        if (card.keyOverride && (card.keyOverride === "jump_height_cm")) {
          // Most recent
          const sorted = [...filteredData].sort((a, b) => {
            const dateA = new Date(a.test_date).getTime();
            const dateB = new Date(b.test_date).getTime();
            return dateB - dateA || (b.repetition_number - a.repetition_number);
          });
          const found = sorted.find(d =>
            d.metrics &&
            (("jump_height_cm" in d.metrics && typeof (d.metrics as any).jump_height_cm === "number") ||
              ("jump_height_ft" in d.metrics && typeof (d.metrics as any).jump_height_ft === "number"))
          );
          if (found && found.metrics) {
            mostRecentValue = resolveJumpHeight(found.metrics, "jump_height_ft", "jump_height_cm");
          }
          // Best (by highest cm)
          const values = filteredData.map(d =>
            d.metrics
              ? resolveJumpHeight(d.metrics, "jump_height_ft", "jump_height_cm")
              : null
          ).filter(v => typeof v === "number" && !isNaN(v)) as number[];
          bestValue = getBest(values, card.metricKey);
        }
        // For relative_peak_power
        else if (card.metricKey === "relative_peak_power") {
          // Most recent
          const sorted = [...filteredData].sort((a, b) => {
            const dateA = new Date(a.test_date).getTime();
            const dateB = new Date(b.test_date).getTime();
            return dateB - dateA || (b.repetition_number - a.repetition_number);
          });
          const found = sorted.find(d =>
            d.metrics && typeof (d.metrics as any).peak_power === "number" && typeof (d.metrics as any).body_mass === "number"
          );
          if (found && found.metrics) {
            mostRecentValue = computeRelativePeakPower(found.metrics);
          }
          // Best (by highest relative)
          const values = filteredData.map(d =>
            computeRelativePeakPower(d.metrics)
          ).filter(v => typeof v === "number" && !isNaN(v)) as number[];
          bestValue = getBest(values, card.metricKey);
        }
        // Otherwise raw metric key
        else {
          mostRecentValue = getMostRecent(card.metricKey);
          bestValue = getBest(getAllValues(card.metricKey), card.metricKey);
        }

        // Percent change for arrow (this does not always make sense, but keep former logic)
        let percent = null;
        if (bestValue !== null && mostRecentValue !== null && bestValue !== 0) {
          if (isLowerBetter(card.metricKey)) {
            percent = ((bestValue - mostRecentValue) / bestValue) * 100;
          } else {
            percent = ((mostRecentValue - bestValue) / bestValue) * 100;
          }
        }
        const { arrow, color } = percent !== null ? getArrowInfo(percent, card.metricKey) : { arrow: "", color: "" };

        // Format
        const formattedRecent = (card.keyOverride === "jump_height_cm" || card.metricKey === "relative_peak_power")
          ? mostRecentValue !== null && !isNaN(mostRecentValue)
            ? mostRecentValue.toFixed(2) + (card.unit ? ` ${card.unit}` : "")
            : "N/A"
          : formatValue(mostRecentValue, card.unit);

        const formattedBest = (card.keyOverride === "jump_height_cm" || card.metricKey === "relative_peak_power")
          ? bestValue !== null && !isNaN(bestValue)
            ? bestValue.toFixed(2) + (card.unit ? ` ${card.unit}` : "")
            : "N/A"
          : formatValue(bestValue, card.unit);

        return (
          <Card key={index} className="bg-white shadow-md">
            <CardContent className="p-4 text-center flex flex-col items-center">
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-xs text-gray-600 mb-2 h-8 flex items-center justify-center">
                {card.title}
              </div>
              <div className="flex flex-col items-center gap-1 w-full">
                {/* RECENT label */}
                <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-0">
                  RECENT
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">
                  {formattedRecent}
                </div>
                <div className={`text-sm font-medium flex items-center gap-1 mt-1 ${color}`}>
                  {arrow && <span>{arrow}</span>}
                  {percent !== null && !Number.isNaN(percent) && (
                    <span>{Math.abs(percent).toFixed(1)}%</span>
                  )}
                </div>
                {/* ALL TIME BEST label */}
                <div className="text-[12px] font-bold text-gray-500 uppercase tracking-wide mb-0 mt-1">
                  ALL TIME BEST
                </div>
                <div className="text-lg font-semibold text-green-700 mt-0">
                  {formattedBest}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
