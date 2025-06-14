import { Card, CardContent } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { getImprovementDirection } from "@/utils/metricsInfo";

interface MetricCardsProps {
  selectedTest: string;
  data: TestData[];
}

export const MetricCards = ({ selectedTest, data }: MetricCardsProps) => {
  // Filter data
  const filteredData = selectedTest
    ? data.filter(d => d.test_name === selectedTest)
    : [];

  // Helper: Find the most recent and best value for each metric (by date for most recent)
  function getMetricInfo(metricKey: string): {
    recent?: { value: number, date: string },
    best?: { value: number, date: string }
  } {
    if (filteredData.length === 0) return {};

    // Only take those with a valid value
    const vals = filteredData
      .map(d => ({ value: Number((d.metrics as any)[metricKey]), date: d.test_date }))
      .filter(d => typeof d.value === "number" && !isNaN(d.value));

    if (vals.length === 0) return {};

    // Most recent: highest date (assumes ISO string)
    vals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = vals[0];

    // Best depends on direction
    const direction = getImprovementDirection(metricKey);
    const best = direction === "higher"
      ? vals.reduce((a, b) => (b.value > a.value ? b : a), vals[0])
      : vals.reduce((a, b) => (b.value < a.value ? b : a), vals[0]);

    return { recent, best };
  }

  // Metric config for cards.
  const metricCardsConfig = [
    {
      icon: "⚡",
      title: "Force",
      metricKey: selectedTest && (selectedTest.toLowerCase().includes('isometric') ? "force_peak" : "peak_force"),
      unit: "N"
    },
    {
      icon: "📏",
      title: "Height",
      metricKey: selectedTest && (selectedTest.toLowerCase().includes("pogo")
        ? "avg_jump_height"
        : (selectedTest.toLowerCase().includes('jump') || selectedTest.toLowerCase().includes('cmj') || selectedTest.toLowerCase().includes("squat"))
          ? "jump_height_ft"
          : ""),
      unit: selectedTest && selectedTest.toLowerCase().includes("pogo") ? "m" : "ft"
    },
    {
      icon: "⚡",
      title: "Power",
      metricKey: selectedTest && (selectedTest.toLowerCase().includes("pogo")
        ? "avg_power"
        : "peak_power"),
      unit: "W"
    },
    {
      icon: "⏱️",
      title: "Contact/Time",
      metricKey: selectedTest && (
        selectedTest.toLowerCase().includes('isometric') ? "time_to_peak_force"
        : selectedTest.toLowerCase().includes("pogo") ? "avg_contact_time"
        : "contact_time"),
      unit: "ms"
    }
  ];

  // Format helpers
  function formatValue(val?: number, unit?: string) {
    if (val == null || isNaN(val)) return "N/A";
    if (unit === "ms") return `${val.toFixed(0)} ms`;
    if (unit === "ft" || unit === "m") return `${val.toFixed(2)} ${unit}`;
    return `${val.toFixed(1)}${unit ? " " + unit : ""}`;
  }

  // Calculate improvement details
  function percentDiff(recent: number, best: number, direction: "higher" | "lower") {
    if (!isFinite(recent) || !isFinite(best) || best === 0) return null;
    // For "higher is better", positive is improvement, for "lower is better", negative is improvement.
    let pct: number;
    if (direction === "higher") {
      pct = ((recent - best) / best) * 100;
    } else {
      pct = ((best - recent) / best) * 100;
    }
    return pct;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {metricCardsConfig.map((card, idx) => {
        if (!card.metricKey) return (
          <Card key={idx} className="bg-white shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-xs text-gray-600 mb-2 h-8 flex items-center justify-center">
                Select Test Name
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                N/A
              </div>
              <div className="text-sm text-gray-500">
                No Data
              </div>
            </CardContent>
          </Card>
        );

        const { recent, best } = getMetricInfo(card.metricKey);
        const dir = getImprovementDirection(card.metricKey);

        const pct = recent && best && recent.value != null && best.value != null
          ? percentDiff(recent.value, best.value, dir)
          : null;

        // Arrow, color
        let color = "text-green-600";
        let arrow = <ArrowUpCircle className="inline w-4 h-4 mr-1" />;
        if (pct != null) {
          if (dir === "higher") {
            if (pct < 0) { // worse
              color = "text-red-600";
              arrow = <ArrowDownCircle className="inline w-4 h-4 mr-1" />;
            }
          } else {
            if (pct < 0) { // worse in "lower better"
              color = "text-red-600";
              arrow = <ArrowDownCircle className="inline w-4 h-4 mr-1" />;
            }
          }
        }

        return (
          <Card key={idx} className="bg-white shadow-md flex flex-col h-full">
            <CardContent className="p-4 text-center flex flex-col h-full">
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-xs text-gray-600 mb-2 h-8 flex items-center justify-center">
                {card.title}
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {formatValue(recent?.value, card.unit)}
              </div>
              <div className={`text-sm font-medium mb-1 ${color}`}>
                {pct != null && isFinite(pct) ? (
                  <>
                    {arrow}
                    {Math.abs(pct).toFixed(1)}%
                  </>
                ) : <span className="text-gray-400">No Comparison</span>}
              </div>
              <div className="text-xs text-gray-500 mt-auto">
                Best: {formatValue(best?.value, card.unit)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
