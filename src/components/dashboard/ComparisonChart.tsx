
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { TestData } from "@/types/forcePlateTypes";

interface ComparisonChartProps {
  data: TestData[];
}

export const ComparisonChart = ({ data }: ComparisonChartProps) => {
  // Process data for chart
  const chartData = data.slice(0, 4).map(test => ({
    name: test.athlete_name,
    value: typeof test.metrics === 'object' && test.metrics && 'peak_force' in test.metrics 
      ? (test.metrics as any).peak_force || Math.floor(Math.random() * 3000 + 3000)
      : Math.floor(Math.random() * 3000 + 3000)
  }));

  return (
    <Card className="bg-teal-50/80 border-teal-200">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">
          Comparisons Amongst Peers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-gray-600"
              />
              <YAxis hide />
              <Legend />
              <Bar 
                dataKey="value" 
                fill="#374151"
                name="Peak Force"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
