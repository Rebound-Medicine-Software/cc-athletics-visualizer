import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea } from "recharts";
import { TestData } from "@/types/forcePlateTypes";

interface ComparisonChartProps {
  data: TestData[];
  testName?: string;
  metricType?: string;
}

const metricCaseLogic = (
  test: TestData,
  testName?: string,
  metricType?: string
): { value: number | null; yAxisLabel: string } => {
  if (!testName || !metricType) return { value: null, yAxisLabel: "Peak Force (N)" };

  let value: number | undefined | null;
  let yAxisLabel = metricType;

  // Helper for camel/underscore
  const pick = (keys: string[]) =>
    keys.find(k => (test.metrics as any)?.[k] !== undefined) ?
      (test.metrics as any)[keys.find(k => (test.metrics as any)?.[k] !== undefined) as string] : null;

  switch (testName) {
    case "Drop Jump":
      if (metricType === "Jump Height (cm)") value = pick(["jump_height_ft", "jump_height"]);
      if (metricType === "Contact Time") value = pick(["contact_time", "avg_contact_time"]);
      if (metricType === "Reactive Strength Index") value = pick(["rsi", "avg_rsi"]);
      if (metricType === "Flight Time") value = pick(["flight_time", "avg_flight_time"]);
      break;
    case "Countermovement Jump":
      if (metricType === "Jump Height (cm)") value = pick(["jump_height_ft", "jump_height"]);
      if (metricType === "Peak Power") value = pick(["peak_power"]);
      if (metricType === "Relative Peak Power") {
        // Compute relative peak power = Peak Power / Body Mass
        const peak_power = pick(["peak_power"]);
        const body_mass = pick(["body_mass"]);
        if (
          peak_power !== null &&
          body_mass !== null &&
          !isNaN(Number(peak_power)) &&
          !isNaN(Number(body_mass)) &&
          Number(body_mass) !== 0
        ) {
          value = Number(peak_power) / Number(body_mass);
        } else {
          value = null;
        }
        yAxisLabel = "Relative Peak Power (W/kg)";
      }
      if (metricType === "Reactive Strength Index") value = pick(["rsi", "avg_rsi"]);
      break;
    case "Squat Jump":
      if (metricType === "Jump Height (cm)") value = pick(["jump_height_ft", "jump_height"]);
      if (metricType === "Take-off Velocity") value = pick(["takeoff_velocity", "peak_velocity"]);
      if (metricType === "Average Rate of Force Development") value = pick(["avg_rfd", "rate_of_force_development", "rfd_max"]);
      if (metricType === "Average Propulsive Power") value = pick(["avg_propulsive_power", "avg_power"]);
      break;
    case "Pogo Jump":
      if (metricType === "Jump Height (cm)" || metricType === "Jump Height (Pogo)") value = pick(["jump_height", "avg_jump_height"]);
      if (metricType === "Power") value = pick(["power", "avg_power"]);
      if (metricType === "Flight Time") value = pick(["flight_time", "avg_flight_time"]);
      if (metricType === "Reactive Strength Index") value = pick(["rsi", "avg_rsi"]);
      break;
    default:
      // "Isometric Test" etc.
      if (metricType === "Maximum Rate of Force Development") value = pick(["rfd_max", "avg_rfd"]);
      if (metricType === "Force at Max Rate of Force Development") value = pick(["force_150ms", "force_100ms", "force_50ms", "force_peak"]);
      if (metricType === "Peak Force" || metricType === "ISO Peak Force") value = pick(["peak_force", "force_peak"]);
      break;
  }

  // try to get number
  if (value !== undefined && value !== null && !isNaN(Number(value))) {
    return { value: Number(value), yAxisLabel };
  }
  return { value: null, yAxisLabel };
};

const getRfdMaxDateAverages = (athleteData: TestData[]) => {
  // Group by date, average rfd_max for each date, return array of date averages
  const dateMap: Record<string, number[]> = {};
  athleteData.forEach(test => {
    const value = (test.metrics as any)?.rfd_max;
    if (value !== undefined && value !== null && !isNaN(Number(value))) {
      const d = test.test_date;
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(Number(value));
    }
  });
  return Object.values(dateMap).map(arr => arr.reduce((s, v) => s + v, 0) / arr.length);
};

export const ComparisonChart = ({ data, testName, metricType }: ComparisonChartProps) => {
  // Custom logic for RFD Max: use max average-by-date for each athlete
  const useRfdMax =
    metricType === "Maximum Rate of Force Development" ||
    metricType === "RFD Max";

  // Group and average data for chart: top 6 per metric value
  const chartData = (() => {
    if (!data || data.length === 0) return [];
    const athleteMap: Record<string, { values: number[], team: string, all: TestData[] }> = {};
    data.forEach(test => {
      const athlete = test.athlete_name;
      if (!athleteMap[athlete]) athleteMap[athlete] = { values: [], team: test.team_name, all: [] };
      athleteMap[athlete].all.push(test);
    });
    return Object.entries(athleteMap)
      .map(([name, d]) => {
        let value: number;
        if (useRfdMax) {
          const dateAverages = getRfdMaxDateAverages(d.all);
          value = dateAverages.length > 0 ? Math.max(...dateAverages) : NaN;
        } else {
          // original metric extraction
          const { value: val } = metricCaseLogic(d.all[0], testName, metricType);
          value = val !== null ? Number(val) : NaN;
        }
        return {
          name: name.length > 12 ? name.substring(0, 12) + "..." : name,
          fullName: name,
          value,
          team: d.team,
        };
      })
      .filter(d => d.value !== null && !isNaN(d.value))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  // Determine max value for calculating band percentages
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
  // Bands: 'The Best' 90-100% (green), 'Good' 75-90% (yellow), 'Modest' 50-75% (orange)
  const bandAreas = [
    {
      name: "The Best",
      color: "#bbf7d0", // tailwind green-200
      from: maxValue * 0.9,
      to: maxValue,
    },
    {
      name: "Good",
      color: "#fde68a", // tailwind yellow-200
      from: maxValue * 0.75,
      to: maxValue * 0.9,
    },
    {
      name: "Modest",
      color: "#fed7aa", // tailwind orange-200
      from: maxValue * 0.5,
      to: maxValue * 0.75,
    },
  ];

  // Y axis label
  const yAxisLabel = chartData.length > 0 && chartData[0].value !== undefined
    ? metricCaseLogic(data[0], testName, metricType).yAxisLabel
    : metricType || "Peak Force (N)";

  if (chartData.length === 0) {
    return (
      <Card className="bg-teal-50/80 border-teal-200 mt-6">
        <CardHeader>
          <CardTitle className="text-center text-lg text-gray-800">
            Comparisons Amongst Peers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full flex items-center justify-center">
            <p className="text-gray-600">No data available for comparison</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-teal-50/80 border-teal-200 mt-6">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">
          Comparisons Amongst Peers{metricType ? ` - ${metricType}` : " - Peak Force"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] md:h-[480px] w-full px-2 md:px-6">
          <ResponsiveContainer width="100%" height="95%">
            <BarChart
              data={chartData}
              margin={{
                top: 28,
                right: 30,
                left: 20,
                bottom: 70,
              }}
              barCategoryGap="25%" // 5% increase over default (was 30%)
            >
              {/* Colored achievement bands */}
              {maxValue > 0 &&
                bandAreas.map(band => (
                  <ReferenceArea
                    key={band.name}
                    y1={band.from}
                    y2={band.to}
                    label={null}
                    fill={band.color}
                    fillOpacity={0.55}
                    stroke="none"
                    ifOverflow="extendDomain"
                  />
                ))
              }
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-gray-600"
                angle={-45}
                textAnchor="end"
                height={65}
              />
              <YAxis
                tick={{ fontSize: 13 }}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 14, fill: "#374151" },
                }}
              />
              <Tooltip
                cursor={{ fill: '#e0e7ef44' }}
                contentStyle={{ borderRadius: 8, backgroundColor: "#fff" }}
                formatter={(v: any) => (typeof v === "number" ? v.toFixed(2) : v)}
              />
              <Bar
                dataKey="value"
                fill="#374151"
                name={yAxisLabel}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 items-center justify-center text-xs">
            <span className="flex items-center"><span className="w-4 h-3 rounded mr-1" style={{background:'#bbf7d0'}}></span> The Best (90-100%)</span>
            <span className="flex items-center"><span className="w-4 h-3 rounded mr-1" style={{background:'#fde68a'}}></span> Good (75-90%)</span>
            <span className="flex items-center"><span className="w-4 h-3 rounded mr-1" style={{background:'#fed7aa'}}></span> Modest (50-75%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
