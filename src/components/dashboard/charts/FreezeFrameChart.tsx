import React, { useRef, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface FreezeFrameChartProps {
  data: any[];
  selectedMetricType: string | null;
  branding?: any;
  getMetricUnit: (metricType: string | null) => string;
  formatDate: (date: string) => string;
}

export const FreezeFrameChart = ({ 
  data, 
  selectedMetricType, 
  branding, 
  getMetricUnit,
  formatDate 
}: FreezeFrameChartProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [yAxisWidth, setYAxisWidth] = useState(60);

  // Calculate minimum chart width based on data points
  const minChartWidth = Math.max(600, data.length * 80);

  useEffect(() => {
    // Measure Y-axis width dynamically if needed
    setYAxisWidth(80);
  }, [data]);

  return (
    <div className="relative h-[200px] w-full">
      {/* Fixed Y-axis container */}
      <div 
        className="absolute left-0 z-10 bg-white border-r border-gray-200"
        style={{ 
          width: `${yAxisWidth}px`, 
          height: 'calc(100% - 60px)',
          top: '20px'
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={data} 
            margin={{ top: 20, right: 0, left: 20, bottom: 60 }}
          >
            <YAxis 
              fontSize={11}
              tickFormatter={(value) => `${value.toFixed(1)}`}
              label={{
                value: data.length > 0 ? data[0].yAxisLabel : selectedMetricType || "Metric",
                angle: -90,
                position: 'insideLeft',
                style: { 
                  textAnchor: 'middle', 
                  fontSize: 8, 
                  fill: branding?.primary_color || "#374151" 
                },
              }}
            />
            {/* Hidden line to maintain Y-axis scale */}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="transparent"
              strokeWidth={0}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scrollable chart container */}
      <div 
        ref={scrollContainerRef}
        className="absolute right-0 top-0 overflow-x-auto overflow-y-hidden"
        style={{ 
          left: `${yAxisWidth}px`, 
          height: '100%',
          width: `calc(100% - ${yAxisWidth}px)`
        }}
      >
        <div style={{ width: `${minChartWidth}px`, height: '100%' }}>
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
              {/* Hidden Y-axis to maintain proper scaling */}
              <YAxis 
                fontSize={11}
                tickFormatter={(value) => `${value.toFixed(1)}`}
                hide={true}
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
                stroke={branding?.primary_color || "#3B82F6"}
                strokeWidth={2}
                dot={{ 
                  fill: branding?.primary_color || "#3B82F6", 
                  strokeWidth: 2, 
                  r: 4 
                }}
                activeDot={{ 
                  r: 6, 
                  fill: branding?.secondary_color || "#EF4444" 
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};