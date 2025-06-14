
// Refactored: now uses subcomponents and helpers for maintainability!
import { TestData } from "@/types/forcePlateTypes";
import { getCardConfigs, isLowerBetter } from "./metric-cards/metricCardConfig";
import { MetricCard } from "./metric-cards/MetricCard";

// Compare function for best metric (returns best value based on metric)
const getBest = (arr: number[], metricKey: string): number | null => {
  if (arr.length === 0) return null;
  return isLowerBetter(metricKey) ? Math.min(...arr) : Math.max(...arr);
};

// Format arrow and color based on improvement
const getArrowInfo = (change: number, metricKey: string) => {
  if (change === null || change === undefined) return { arrow: "", color: "" };
  // "Better" = up arrow for higher-better metrics, down arrow for lower-better metrics
  const better = isLowerBetter(metricKey) ? change > 0 : change > 0;
  return {
    arrow: change === 0 ? "" : (better ? "↑" : "↓"),
    color:
      change === 0
        ? "text-gray-500"
        : better
        ? "text-green-600"
        : "text-red-600",
  };
};

const formatValue = (value: number | null | undefined, unit?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
};

// Helper to try to get value either from .jump_height_cm or convert ft to cm
function resolveJumpHeight(metricObj: any, ftKey: string, cmKey: string) {
  if (metricObj && cmKey in metricObj && typeof metricObj[cmKey] === "number") {
    return metricObj[cmKey];
  } else if (
    metricObj &&
    ftKey in metricObj &&
    typeof metricObj[ftKey] === "number"
  ) {
    const feetVal = metricObj[ftKey];
    if (!isNaN(feetVal)) return feetVal * 30.48; // 1 ft = 30.48 cm
  }
  return null;
}
// For Countermovement Jump only: relative peak power = peak_power / body_mass
function computeRelativePeakPower(metricsObj: any) {
  if (
    metricsObj &&
    "peak_power" in metricsObj &&
    "body_mass" in metricsObj
  ) {
    const pp = metricsObj.peak_power;
    const bm = metricsObj.body_mass;
    if (typeof pp === "number" && typeof bm === "number" && bm !== 0) {
      return pp / bm;
    }
  }
  return null;
}

interface MetricCardsProps {
  selectedTest: string;
  data: TestData[];
}

export const MetricCards = ({ selectedTest, data }: MetricCardsProps) => {
  // Filter data by selected test
  const filteredData = selectedTest
    ? data.filter((d) => d.test_name === selectedTest)
    : [];

  // Helper to get the recent and best value for a given metric
  const getMostRecent = (metricKey: string) => {
    if (filteredData.length === 0) return null;
    const sorted = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.test_date).getTime();
      const dateB = new Date(b.test_date).getTime();
      return dateB - dateA || b.repetition_number - a.repetition_number;
    });
    const firstWithMetric = sorted.find(
      (d) =>
        d.metrics &&
        metricKey in d.metrics &&
        typeof (d.metrics as any)[metricKey] === "number"
    );
    if (firstWithMetric) {
      return (firstWithMetric.metrics as any)[metricKey];
    }
    return null;
  };

  const getAllValues = (metricKey: string) => {
    return filteredData
      .map((d) =>
        d.metrics && metricKey in d.metrics
          ? (d.metrics as any)[metricKey]
          : null
      )
      .filter((v) => typeof v === "number" && !isNaN(v)) as number[];
  };

  const cardConfigs = getCardConfigs(selectedTest);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cardConfigs.map((card, index) => {
        if (!card.metricKey) {
          return (
            <MetricCard
              key={index}
              icon={card.icon}
              title={card.title}
              formattedRecent="N/A"
              formattedBest="N/A"
            />
          );
        }

        let mostRecentValue: number | null = null;
        let bestValue: number | null = null;

        if (card.keyOverride && card.keyOverride === "jump_height_cm") {
          // Most recent
          const sorted = [...filteredData].sort((a, b) => {
            const dateA = new Date(a.test_date).getTime();
            const dateB = new Date(b.test_date).getTime();
            return dateB - dateA || b.repetition_number - a.repetition_number;
          });
          const found = sorted.find(
            (d) =>
              d.metrics &&
              (("jump_height_cm" in d.metrics &&
                typeof (d.metrics as any).jump_height_cm === "number") ||
                ("jump_height_ft" in d.metrics &&
                  typeof (d.metrics as any).jump_height_ft === "number"))
          );
          if (found && found.metrics) {
            mostRecentValue = resolveJumpHeight(
              found.metrics,
              "jump_height_ft",
              "jump_height_cm"
            );
          }
          // Best (by highest cm)
          const values = filteredData
            .map((d) =>
              d.metrics
                ? resolveJumpHeight(d.metrics, "jump_height_ft", "jump_height_cm")
                : null
            )
            .filter((v) => typeof v === "number" && !isNaN(v)) as number[];
          bestValue = getBest(values, card.metricKey);
        } else if (card.metricKey === "relative_peak_power") {
          // Most recent
          const sorted = [...filteredData].sort((a, b) => {
            const dateA = new Date(a.test_date).getTime();
            const dateB = new Date(b.test_date).getTime();
            return dateB - dateA || b.repetition_number - a.repetition_number;
          });
          const found = sorted.find(
            (d) =>
              d.metrics &&
              typeof (d.metrics as any).peak_power === "number" &&
              typeof (d.metrics as any).body_mass === "number"
          );
          if (found && found.metrics) {
            mostRecentValue = computeRelativePeakPower(found.metrics);
          }
          // Best (by highest relative)
          const values = filteredData
            .map((d) => computeRelativePeakPower(d.metrics))
            .filter((v) => typeof v === "number" && !isNaN(v)) as number[];
          bestValue = getBest(values, card.metricKey);
        } else {
          mostRecentValue = getMostRecent(card.metricKey);
          bestValue = getBest(getAllValues(card.metricKey), card.metricKey);
        }

        // Percent change for arrow
        let percent = null;
        if (
          bestValue !== null &&
          mostRecentValue !== null &&
          bestValue !== 0
        ) {
          if (isLowerBetter(card.metricKey)) {
            percent = ((bestValue - mostRecentValue) / bestValue) * 100;
          } else {
            percent = ((mostRecentValue - bestValue) / bestValue) * 100;
          }
        }
        const { arrow, color } =
          percent !== null
            ? getArrowInfo(percent, card.metricKey)
            : { arrow: "", color: "" };

        const formattedRecent =
          card.keyOverride === "jump_height_cm" ||
          card.metricKey === "relative_peak_power"
            ? mostRecentValue !== null && !isNaN(mostRecentValue)
              ? mostRecentValue.toFixed(2) + (card.unit ? ` ${card.unit}` : "")
              : "N/A"
            : formatValue(mostRecentValue, card.unit);

        const formattedBest =
          card.keyOverride === "jump_height_cm" ||
          card.metricKey === "relative_peak_power"
            ? bestValue !== null && !isNaN(bestValue)
              ? bestValue.toFixed(2) + (card.unit ? ` ${card.unit}` : "")
              : "N/A"
            : formatValue(bestValue, card.unit);

        return (
          <MetricCard
            key={index}
            icon={card.icon}
            title={card.title}
            formattedRecent={formattedRecent}
            formattedBest={formattedBest}
            arrow={arrow}
            color={color}
            percent={percent}
          />
        );
      })}
    </div>
  );
};
