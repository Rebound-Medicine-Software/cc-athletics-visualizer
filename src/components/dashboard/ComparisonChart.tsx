
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { metricCaseLogic } from "./chart/useMetricCaseLogic";
import { ChartLegend } from "./chart/ChartLegend";
import { EmptyComparisonChart } from "./chart/EmptyComparisonChart";

interface ComparisonChartProps {
  data: TestData[];
  testName?: string;
  metricType?: string;
}

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

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
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

  const yAxisLabel = chartData.length > 0 && chartData[0].value !== undefined
    ? metricCaseLogic(data[0], testName, metricType).yAxisLabel
    : metricType || "Peak Force (N)";

  if (chartData.length === 0) {
    return <EmptyComparisonChart />;
  }

  return (
    <Card className="bg-teal-50/80 border-teal-200">
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
              barCategoryGap="25%"
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
          <ChartLegend />
        </div>
      </CardContent>
    </Card>
  );
};
