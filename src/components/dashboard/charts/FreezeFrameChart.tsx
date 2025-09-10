import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface FreezeFrameChartProps {
  data: Array<{
    date: string;
    value: number;
    yAxisLabel: string;
  }>;
  selectedMetricType: string;
  branding?: any;
  getMetricUnit: (metricType: string | null) => string;
}

export const FreezeFrameChart = ({ data, selectedMetricType, branding, getMetricUnit }: FreezeFrameChartProps) => {
  if (!data.length) return null;

  // Calculate Y-axis domain from actual data
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 1; // Ensure some padding even for single values
  const yDomain = [Math.max(0, minValue - padding), maxValue + padding];

  return (
    <div className="relative h-[200px] w-full">
      {/* Fixed Y-axis container */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-white z-10 border-r border-gray-200">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data} // Use actual data for proper scaling
            margin={{ top: 20, right: 0, left: 0, bottom: 60 }}
          >
            <YAxis 
              fontSize={11}
              domain={yDomain}
              type="number"
              tickFormatter={(value) => `${value.toFixed(1)}`}
              label={{
                value: data[0]?.yAxisLabel || selectedMetricType || "Metric",
                angle: -90,
                position: 'insideLeft',
                style: { 
                  textAnchor: 'middle', 
                  fontSize: 8, 
                  fill: branding?.primary_color || "#374151" 
                },
              }}
            />
            {/* Invisible line to maintain proper scaling */}
            <Line 
              dataKey="value" 
              stroke="transparent"
              dot={false}
              strokeWidth={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scrollable chart container */}
      <div className="absolute left-16 right-0 top-0 bottom-0 overflow-x-auto">
        <div style={{ width: Math.max(300, data.length * 80), height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <XAxis 
                dataKey="date" 
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                hide
                domain={yDomain}
                type="number"
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const unit = getMetricUnit(selectedMetricType);
                  return [`${value.toFixed(1)}${unit}`, name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={branding?.primary_color || "#7DD3FC"}
                strokeWidth={3}
                dot={{ 
                  fill: branding?.primary_color || "#7DD3FC", 
                  strokeWidth: 2, 
                  r: 5,
                  stroke: branding?.accent_color || "#7DD3FC"
                }}
                name={selectedMetricType || "Metric"}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};