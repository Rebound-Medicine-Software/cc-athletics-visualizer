import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

interface EliteComparisonChartProps {
  eliteData: any[];
  individualData: any[];
  metricType: string;
  isLoading: boolean;
}

export const EliteComparisonChart = ({ 
  eliteData, 
  individualData, 
  metricType, 
  isLoading 
}: EliteComparisonChartProps) => {
  
  const chartData = useMemo(() => {
    if (metricType === "all" || !eliteData.length || !individualData.length) {
      return [];
    }

    // Calculate elite benchmark (average of filtered elite data)
    let eliteBenchmark = 0;
    let eliteCount = 0;

    eliteData.forEach(athlete => {
      let value = 0;
      switch (metricType) {
        case "CMJ Jump Height (cm)":
          value = athlete["CMJ Jump Height (cm)"] || 0;
          break;
        case "CMJ Peak Power (W)":
          value = athlete["CMJ Peak Power (W)"] || 0;
          break;
        case "CMJ Relative Peak Power (W/kg)":
          value = athlete["CMJ Relative Peak Power (W/kg)"] || 0;
          break;
        case "IMTP Peak Force (N)":
          value = athlete["IMTP Peak Force (N)"] || 0;
          break;
        case "IMTP Relative Peak Force (N/kg)":
          value = athlete["IMTP Relative Peak Force (N/kg)"] || 0;
          break;
      }
      if (value > 0) {
        eliteBenchmark += value;
        eliteCount++;
      }
    });

    if (eliteCount > 0) {
      eliteBenchmark = eliteBenchmark / eliteCount;
    }

    // Extract individual athlete values
    const individualValues: { name: string; value: number; type: string }[] = [];
    
    individualData.forEach(test => {
      const metrics = test.metrics as any;
      let value = 0;
      
      switch (metricType) {
        case "CMJ Jump Height (cm)":
          value = metrics?.jump_height_ft ? metrics.jump_height_ft * 30.48 : metrics?.jump_height || 0;
          break;
        case "CMJ Peak Power (W)":
          value = metrics?.peak_power || 0;
          break;
        case "CMJ Relative Peak Power (W/kg)":
          const peakPower = metrics?.peak_power || 0;
          const bodyMass = metrics?.body_mass || 0;
          value = bodyMass > 0 ? peakPower / bodyMass : 0;
          break;
        case "IMTP Peak Force (N)":
          value = metrics?.peak_force || metrics?.force_peak || 0;
          break;
        case "IMTP Relative Peak Force (N/kg)":
          const force = metrics?.peak_force || metrics?.force_peak || 0;
          const mass = metrics?.body_mass || 0;
          value = mass > 0 ? force / mass : 0;
          break;
      }
      
      if (value > 0) {
        individualValues.push({
          name: test.athlete_name,
          value: value,
          type: "individual"
        });
      }
    });

    // Combine data for chart
    const chartData = [
      ...individualValues,
      {
        name: "Elite Benchmark",
        value: eliteBenchmark,
        type: "elite"
      }
    ];

    return chartData.sort((a, b) => b.value - a.value);
  }, [eliteData, individualData, metricType]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (metricType === "all") {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">Please select a metric type to view comparison</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-gray-500">No data available for selected filters</div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value));
  const yAxisMax = maxValue * 1.1;

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          barCategoryGap="10%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fontSize: 12, fill: '#374151' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#374151' }}
            domain={[0, yAxisMax]}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => [value.toFixed(2), metricType]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.type === "elite" ? "#ef4444" : "#3b82f6"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};