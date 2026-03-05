
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

  // Group by athlete + test_date, then take best rep per group
  const getBestPerAthleteDate = (metricKey: string, lowerBetter = false) => {
    const groups: Record<string, number[]> = {};
    filteredData.forEach((d) => {
      if (d.metrics && metricKey in d.metrics && typeof (d.metrics as any)[metricKey] === "number") {
        const key = `${d.athlete_name}||${d.test_date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push((d.metrics as any)[metricKey]);
      }
    });
    // Best rep per athlete per date
    return Object.values(groups).map(vals =>
      lowerBetter ? Math.min(...vals) : Math.max(...vals)
    );
  };

  // Helper to get the most recent best-per-date value for a given metric
  const getMostRecent = (metricKey: string) => {
    if (filteredData.length === 0) return null;
    // Group by athlete+date, take best rep per group, then find most recent group
    const groups: Record<string, { date: string; values: number[] }> = {};
    filteredData.forEach((d) => {
      if (d.metrics && metricKey in d.metrics && typeof (d.metrics as any)[metricKey] === "number") {
        const key = `${d.athlete_name}||${d.test_date}`;
        if (!groups[key]) groups[key] = { date: d.test_date, values: [] };
        groups[key].values.push((d.metrics as any)[metricKey]);
      }
    });
    const entries = Object.values(groups);
    if (entries.length === 0) return null;
    // Sort by date descending, return best rep from most recent date
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lowerBetter = isLowerBetter(metricKey);
    return lowerBetter ? Math.min(...entries[0].values) : Math.max(...entries[0].values);
  };

  const getAllValues = (metricKey: string) => {
    return getBestPerAthleteDate(metricKey, isLowerBetter(metricKey));
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
          // Group by athlete+date, best rep per group
          const groups: Record<string, { date: string; values: number[] }> = {};
          filteredData.forEach((d) => {
            if (d.metrics) {
              const val = resolveJumpHeight(d.metrics, "jump_height_ft", "jump_height_cm");
              if (val !== null) {
                const key = `${d.athlete_name}||${d.test_date}`;
                if (!groups[key]) groups[key] = { date: d.test_date, values: [] };
                groups[key].values.push(val);
              }
            }
          });
          const entries = Object.values(groups);
          if (entries.length > 0) {
            // Most recent = best rep from most recent date
            entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            mostRecentValue = Math.max(...entries[0].values);
            // Best = best across all date groups
            const allBests = entries.map(e => Math.max(...e.values));
            bestValue = getBest(allBests, card.metricKey);
          }
        } else if (card.metricKey === "relative_peak_power") {
          // Group by athlete+date, best rep per group
          const groups: Record<string, { date: string; values: number[] }> = {};
          filteredData.forEach((d) => {
            const val = computeRelativePeakPower(d.metrics);
            if (val !== null) {
              const key = `${d.athlete_name}||${d.test_date}`;
              if (!groups[key]) groups[key] = { date: d.test_date, values: [] };
              groups[key].values.push(val);
            }
          });
          const entries = Object.values(groups);
          if (entries.length > 0) {
            entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            mostRecentValue = Math.max(...entries[0].values);
            const allBests = entries.map(e => Math.max(...e.values));
            bestValue = getBest(allBests, card.metricKey);
          }
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
