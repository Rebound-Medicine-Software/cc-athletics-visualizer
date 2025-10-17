import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";

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

    // Extract individual athlete values - best result per athlete
    const athleteBestValues = new Map<string, number>();
    
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
        const currentBest = athleteBestValues.get(test.athlete_name) || 0;
        if (value > currentBest) {
          athleteBestValues.set(test.athlete_name, value);
        }
      }
    });

    // Convert map to array
    const individualValues = Array.from(athleteBestValues.entries()).map(([name, value]) => ({
      name,
      value,
      type: "individual"
    }));

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
  
  // Define colored achievement bands like in ComparisonChart
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

  return (
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
              value: metricType,
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
            name={metricType}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};