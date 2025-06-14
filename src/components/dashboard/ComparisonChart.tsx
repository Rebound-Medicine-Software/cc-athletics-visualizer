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
      if (metricType === "Relative Peak Power") value = pick(["avg_propulsive_power", "avg_power"]);
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

export const ComparisonChart = ({ data, testName, metricType }: ComparisonChartProps) => {
  // Group and average data for chart: top 6 per metric value
  const chartData = (() => {
    if (!data || data.length === 0) return [];
    const athleteMap: Record<string, { values: number[], team: string }> = {};
    data.forEach(test => {
      const { value } = metricCaseLogic(test, testName, metricType);
      if (value !== null && !isNaN(value)) {
        if (!athleteMap[test.athlete_name]) {
          athleteMap[test.athlete_name] = { values: [], team: test.team_name };
        }
        athleteMap[test.athlete_name].values.push(value);
      }
    });
    return Object.entries(athleteMap)
      .map(([name, d]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        value: d.values.reduce((sum, v) => sum + v, 0) / d.values.length,
        team: d.team,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  // Find the all time best (highest or lowest, depending on metric type)
  const values = chartData.map(d => d.value).filter(v => v !== null && !isNaN(Number(v)));
  if (values.length === 0) {
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

  let bestValue = Math.max(...values);

  // For inverse metrics (where lower is better), use Math.min
  const improvementMetrics = [
    "Contact Time",
    "Avg Contact Time",
    "Flight Time",
    "Time to Peak Force",
    "Take-off Velocity"
  ];
  const isLowerBetter = metricType ? improvementMetrics.some(mt => metricType.toLowerCase().includes(mt.toLowerCase())) : false;
  if (isLowerBetter) {
    bestValue = Math.min(...values);
  }

  // Calculate bands
  let bands;
  if (!isLowerBetter) {
    // Higher is better
    bands = [
      { label: 'Modest', from: bestValue*0.5, to: bestValue*0.7, color: '#ffedd5' },   // orange-100
      { label: 'Good', from: bestValue*0.75, to: bestValue*0.9, color: '#fefcbf' },   // yellow-100
      { label: 'The Best', from: bestValue*0.9, to: bestValue, color: '#dcfce7' },    // green-100
    ];
  } else {
    // Lower is better
    bands = [
      { label: 'The Best', from: bestValue, to: bestValue*1.1, color: '#dcfce7' },    // green-100
      { label: 'Good', from: bestValue*1.1, to: bestValue*1.25, color: '#fefcbf' },   // yellow-100
      { label: 'Modest', from: bestValue*1.25, to: bestValue*1.5, color: '#ffedd5' }, // orange-100
    ];
  }

  // Y axis label
  const yAxisLabel = metricType || "Peak Force (N)";

  return (
    <Card className="bg-teal-50/80 border-teal-200 mt-6">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">
          Comparisons Amongst Peers{metricType ? ` - ${metricType}` : " - Peak Force"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              {/* Bands */}
              {bands.map((band, i) => (
                <ReferenceArea
                  key={i}
                  y1={band.from}
                  y2={band.to}
                  fill={band.color}
                  fillOpacity={0.45}
                  stroke={undefined}
                />
              ))}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-gray-600"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 13, fill: "#374151" },
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
        </div>
      </CardContent>
    </Card>
  );
};
