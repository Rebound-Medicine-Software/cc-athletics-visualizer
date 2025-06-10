
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { TestData } from "@/types/forcePlateTypes";

interface ComparisonChartProps {
  data: TestData[];
}

export const ComparisonChart = ({ data }: ComparisonChartProps) => {
  // Process data for chart - get top performers by peak force
  const getChartData = () => {
    if (!data || data.length === 0) return [];

    // Group by athlete and calculate average peak force
    const athleteData = data.reduce((acc, test) => {
      const peakForce = typeof test.metrics === 'object' && test.metrics && 'peak_force' in test.metrics 
        ? (test.metrics as any).peak_force
        : typeof test.metrics === 'object' && test.metrics && 'force_peak' in test.metrics
        ? (test.metrics as any).force_peak
        : null;

      if (peakForce && typeof peakForce === 'number' && !isNaN(peakForce)) {
        if (!acc[test.athlete_name]) {
          acc[test.athlete_name] = { forces: [], team: test.team_name };
        }
        acc[test.athlete_name].forces.push(peakForce);
      }
      return acc;
    }, {} as Record<string, { forces: number[], team: string }>);

    // Calculate averages and sort by performance
    const chartData = Object.entries(athleteData)
      .map(([name, data]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        value: data.forces.reduce((sum, force) => sum + force, 0) / data.forces.length,
        team: data.team
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Show top 6 performers

    return chartData;
  };

  const chartData = getChartData();

  if (chartData.length === 0) {
    return (
      <Card className="bg-teal-50/80 border-teal-200">
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
    <Card className="bg-teal-50/80 border-teal-200">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">
          Comparisons Amongst Peers - Peak Force
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                className="text-gray-600"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Peak Force (N)', angle: -90, position: 'insideLeft' }}
              />
              <Legend />
              <Bar 
                dataKey="value" 
                fill="#374151"
                name="Peak Force (N)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-gray-600 text-center">
          Showing top 6 performers based on average peak force across all tests
        </div>
      </CardContent>
    </Card>
  );
};
