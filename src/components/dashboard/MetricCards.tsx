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

export const MetricCards = ({ selectedTest, data }: { selectedTest: string, data: TestData[] }) => {
  // Filter data by selected test
  const filteredData = selectedTest
    ? data.filter((d) => d.test_name === selectedTest)
    : [];

  // Helper: collect all repetitions per date, then take avg for that date (per metricKey)
  const getAvgPerDate = (metricKey: string) => {
    const byDate: { [date: string]: number[] } = {};
    filteredData.forEach(d => {
      if (d.metrics && typeof (d.metrics as any)[metricKey] === "number") {
        const dateStr = d.test_date;
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push((d.metrics as any)[metricKey]);
      }
    });
    // result: date => [vals] for this metric
    return Object.entries(byDate).map(([date, vals]) => ({
      date,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    })).filter(e => e.avg !== null);
  };

  // For jump height cm/pogo averaging per date
  const getAvgJumpHeightPerDate = (ftKey: string, cmKey: string) => {
    const byDate: { [date: string]: number[] } = {};
    filteredData.forEach(d => {
      if (d.metrics) {
        let val = null;
        if (cmKey in d.metrics && typeof (d.metrics as any)[cmKey] === "number") {
          val = (d.metrics as any)[cmKey];
        } else if (ftKey in d.metrics && typeof (d.metrics as any)[ftKey] === "number") {
          val = (d.metrics as any)[ftKey] * 30.48;
        }
        if (val !== null) {
          const dateStr = d.test_date;
          if (!byDate[dateStr]) byDate[dateStr] = [];
          byDate[dateStr].push(val);
        }
      }
    });
    return Object.entries(byDate).map(([date, vals]) => ({
      date,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    })).filter(e => e.avg !== null);
  };

  // For relative peak power by date
  const getAvgRelativePeakPowerPerDate = () => {
    const byDate: { [date: string]: number[] } = {};
    filteredData.forEach(d => {
      if (d.metrics && typeof (d.metrics as any).peak_power === "number" && typeof (d.metrics as any).body_mass === "number" && (d.metrics as any).body_mass !== 0) {
        const val = (d.metrics as any).peak_power / (d.metrics as any).body_mass;
        const dateStr = d.test_date;
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push(val);
      }
    });
    return Object.entries(byDate).map(([date, vals]) => ({
      date,
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    })).filter(e => e.avg !== null);
  };

  // Generate card configs
  const cardConfigs = getCardConfigs(selectedTest);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cardConfigs.map((card, index) => {
        if (!card.metricKey) {
          // Placeholder card
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

        let recentAvgValue: number | null = null;
        let bestAvgValue: number | null = null;
        // Per-card avg logic
        let perDateAvgs: { date: string, avg: number }[] = [];
        if (card.keyOverride && card.keyOverride === "jump_height_cm") {
          perDateAvgs = getAvgJumpHeightPerDate("jump_height_ft", "jump_height_cm");
        } else if (card.metricKey === "relative_peak_power") {
          perDateAvgs = getAvgRelativePeakPowerPerDate();
        } else {
          perDateAvgs = getAvgPerDate(card.metricKey);
        }

        // Sort date descending
        perDateAvgs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (perDateAvgs.length > 0) {
          recentAvgValue = perDateAvgs[0].avg;
          bestAvgValue = isLowerBetter(card.metricKey)
            ? Math.min(...perDateAvgs.map(e => e.avg))
            : Math.max(...perDateAvgs.map(e => e.avg));
        }

        // Percent change for arrow (always vs best)
        let percent = null;
        if (
          bestAvgValue !== null &&
          recentAvgValue !== null &&
          bestAvgValue !== 0
        ) {
          if (isLowerBetter(card.metricKey)) {
            percent = ((bestAvgValue - recentAvgValue) / bestAvgValue) * 100;
          } else {
            percent = ((recentAvgValue - bestAvgValue) / bestAvgValue) * 100;
          }
        }
        const { arrow, color } =
          percent !== null
            ? getArrowInfo(percent, card.metricKey)
            : { arrow: "", color: "" };

        const formatAvg = (val: number | null) =>
          val !== null && !isNaN(val)
            ? val.toFixed(2) + (card.unit ? ` ${card.unit}` : "")
            : "N/A";

        return (
          <MetricCard
            key={index}
            icon={card.icon}
            title={card.title}
            formattedRecent={formatAvg(recentAvgValue)}
            formattedBest={formatAvg(bestAvgValue)}
            arrow={arrow}
            color={color}
            percent={percent}
          />
        );
      })}
    </div>
  );
};
