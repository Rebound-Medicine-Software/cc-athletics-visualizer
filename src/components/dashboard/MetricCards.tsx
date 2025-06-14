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

  // Sort by date descending, then rep number descending (most recent first)
  const getMostRecent = (metricKey: string) => {
    if (filteredData.length === 0) return null;
    const sorted = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.test_date).getTime();
      const dateB = new Date(b.test_date).getTime();
      // handle rep number in tie
      return dateB - dateA || (b.repetition_number - a.repetition_number);
    });
    const firstWithMetric = sorted.find(d => d.metrics && metricKey in d.metrics && typeof (d.metrics as any)[metricKey] === "number");
    if (firstWithMetric) {
      return (firstWithMetric.metrics as any)[metricKey];
    }
    return null;
  };

  // All values for this metric in this test set
  const getAllValues = (metricKey: string) => {
    return filteredData
      .map(d => (d.metrics && (metricKey in d.metrics)) ? (d.metrics as any)[metricKey] : null)
      .filter(v => typeof v === "number" && !isNaN(v)) as number[];
  };

  // Define metric configurations
  const getMetricConfig = () => {
    if (!selectedTest || filteredData.length === 0) {
      return [
        { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined },
        { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined },
        { icon: "⚡", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined },
        { icon: "⏱️", title: "Select Test Name", metricKey: "", unit: "", secondaryKey: undefined }
      ];
    }

    if (selectedTest.toLowerCase().includes('jump') || selectedTest.toLowerCase().includes('cmj') || selectedTest.toLowerCase().includes('squat')) {
      return [
        {
          icon: "⚡",
          title: `${selectedTest} - Force`,
          metricKey: "peak_force",
          unit: "N",
          secondaryKey: "avg_propulsive_force"
        },
        {
          icon: "📏",
          title: `${selectedTest} - Height`,
          metricKey: "jump_height_ft",
          unit: "ft",
          secondaryKey: "flight_time"
        },
        {
          icon: "⚡",
          title: `${selectedTest} - Power`,
          metricKey: "peak_power",
          unit: "W",
          secondaryKey: "avg_propulsive_power"
        },
        {
          icon: "⏱️",
          title: `${selectedTest} - Time`,
          metricKey: "contact_time",
          unit: "ms",
          secondaryKey: "time_to_peak_force"
        }
      ];
    }

    if (selectedTest.toLowerCase().includes('isometric')) {
      return [
        {
          icon: "⚡",
          title: `${selectedTest} - Peak Force`,
          metricKey: "force_peak",
          unit: "N",
          secondaryKey: "force_250ms"
        },
        {
          icon: "📈",
          title: `${selectedTest} - RFD`,
          metricKey: "rfd_max",
          unit: "N/s",
          secondaryKey: "rfd_250ms"
        },
        {
          icon: "⚡",
          title: `${selectedTest} - Early Force`,
          metricKey: "force_100ms",
          unit: "N",
          secondaryKey: "force_50ms"
        },
        {
          icon: "⏱️",
          title: `${selectedTest} - Impulse`,
          metricKey: "impulse_250ms",
          unit: "N·s",
          secondaryKey: "impulse_100ms"
        }
      ];
    }

    if (selectedTest.toLowerCase().includes('pogo')) {
      return [
        {
          icon: "⚡",
          title: `${selectedTest} - RSI`,
          metricKey: "avg_rsi",
          unit: "",
          secondaryKey: "rsi"
        },
        {
          icon: "📏",
          title: `${selectedTest} - Height`,
          metricKey: "avg_jump_height",
          unit: "m",
          secondaryKey: "jump_height"
        },
        {
          icon: "⚡",
          title: `${selectedTest} - Power`,
          metricKey: "avg_power",
          unit: "W",
          secondaryKey: "power"
        },
        {
          icon: "⏱️",
          title: `${selectedTest} - Contact Time`,
          metricKey: "avg_contact_time",
          unit: "ms",
          secondaryKey: "contact_time"
        }
      ];
    }

    // Default fallback
    return [
      { icon: "⚡", title: selectedTest, metricKey: "", unit: "", secondaryKey: undefined },
      { icon: "⚡", title: selectedTest, metricKey: "", unit: "", secondaryKey: undefined },
      { icon: "⚡", title: selectedTest, metricKey: "", unit: "", secondaryKey: undefined },
      { icon: "⏱️", title: selectedTest, metricKey: "", unit: "", secondaryKey: undefined }
    ];
  };

  const metricCards = getMetricConfig();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {metricCards.map((card, index) => {
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
        // Get data for this metric
        const mostRecentValue = getMostRecent(card.metricKey);
        const allValues = getAllValues(card.metricKey);
        const bestValue = getBest(allValues, card.metricKey);

        // Percent change to best
        let percent = null;
        if (bestValue !== null && mostRecentValue !== null && bestValue !== 0) {
          // For "lower is better", improvement goes up so (best - recent)/best
          if (isLowerBetter(card.metricKey)) {
            percent = ((bestValue - mostRecentValue) / bestValue) * 100;
          } else {
            percent = ((mostRecentValue - bestValue) / bestValue) * 100;
          }
        }

        // Arrow/color (positive if improvement, red or green)
        const { arrow, color } = percent !== null ? getArrowInfo(percent, card.metricKey) : { arrow: "", color: "" };

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
                  {formatValue(mostRecentValue, card.unit)}
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
                  {formatValue(bestValue, card.unit)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
