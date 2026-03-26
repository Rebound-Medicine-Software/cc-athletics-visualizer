import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, Cell } from "recharts";

const parseMetricType = (metricType: string) => {
  // Extract test name and metric from formats like "Countermovement Jump - Jump Height (cm)"
  if (metricType.includes(' - ')) {
    const [testName, metric] = metricType.split(' - ');
    return { testName: testName.trim(), metric: metric.trim() };
  }
  
  // Fallback for old format without dash
  const parts = metricType.split(' ');
  if (parts.length > 2) {
    const metricPatterns = ['Jump Height (cm)', 'Peak Power (W)', 'Relative Peak Power (W/kg)', 
                           'Reactive Strength Index', 'Flight Time (ms)', 'Contact Time (ms)',
                           'Average Propulsive Power (W)', 'Average Rate of Force Development (W)',
                           'Take-off Velocity (m/s)', 'Power (W)'];
    
    for (const pattern of metricPatterns) {
      if (metricType.includes(pattern)) {
        const testName = metricType.replace(pattern, '').trim();
        return { testName, metric: pattern };
      }
    }
  }
  return { testName: null, metric: metricType };
};

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

    const { testName: parsedTestName, metric: parsedMetric } = parseMetricType(metricType);

    // Calculate elite benchmark (average of filtered elite data)
    let eliteBenchmark = 0;
    let eliteCount = 0;

    eliteData.forEach(athlete => {
      let value = 0;
      
      // Check if it matches static metric pattern (with or without dash)
      const metricToCheck = parsedMetric || metricType;
      
      if (metricToCheck.includes("Jump Height (cm)")) {
        value = athlete["CMJ Jump Height (cm)"] || 0;
      } else if (metricToCheck.includes("Peak Power (W)") && !metricToCheck.includes("Relative")) {
        value = athlete["CMJ Peak Power (W)"] || 0;
      } else if (metricToCheck.includes("Relative Peak Power (W/kg)")) {
        value = athlete["CMJ Relative Peak Power (W/kg)"] || 0;
      } else if (metricToCheck.includes("Peak Force (N)") && !metricToCheck.includes("Relative")) {
        value = athlete["IMTP Peak Force (N)"] || 0;
      } else if (metricToCheck.includes("Relative Peak Force (N/kg)")) {
        value = athlete["IMTP Relative Peak Force (N/kg)"] || 0;
      } else if (athlete.dynamic_metrics && parsedMetric) {
        // Check dynamic metrics
        value = athlete.dynamic_metrics[parsedMetric] || 0;
      }
      
      if (value && value > 0) {
        eliteBenchmark += Number(value);
        eliteCount++;
      }
    });

    if (eliteCount > 0) {
      eliteBenchmark = eliteBenchmark / eliteCount;
    }

    // Extract individual athlete values - best result from most recent test date
    // Step 1: Find the most recent test date per athlete
    const athleteMostRecentDate = new Map<string, string>();
    individualData.forEach(test => {
      const dateStr = (test.test_date || '').toString().slice(0, 10);
      const current = athleteMostRecentDate.get(test.athlete_name);
      if (!current || dateStr > current) {
        athleteMostRecentDate.set(test.athlete_name, dateStr);
      }
    });

    // Step 2: Get best value from most recent date only
    const athleteBestValues = new Map<string, number>();
    
    individualData.forEach(test => {
      const dateStr = (test.test_date || '').toString().slice(0, 10);
      const mostRecentDate = athleteMostRecentDate.get(test.athlete_name);
      if (dateStr !== mostRecentDate) return;

      const metrics = test.metrics as any;
      let value = 0;
      
      // Check if it matches static metric pattern (with or without dash)
      const metricToCheck = parsedMetric || metricType;
      
      if (metricToCheck.includes("Jump Height (cm)")) {
        value = metrics?.jump_height_ft ? metrics.jump_height_ft * 30.48 : metrics?.jump_height || 0;
      } else if (metricToCheck.includes("Peak Power (W)") && !metricToCheck.includes("Relative")) {
        value = metrics?.peak_power || 0;
      } else if (metricToCheck.includes("Relative Peak Power (W/kg)")) {
        const peakPower = metrics?.peak_power || 0;
        const bodyMass = metrics?.body_mass || 0;
        value = bodyMass > 0 ? peakPower / bodyMass : 0;
      } else if (metricToCheck.includes("Peak Force (N)") && !metricToCheck.includes("Relative")) {
        value = metrics?.peak_force || metrics?.force_peak || 0;
      } else if (metricToCheck.includes("Relative Peak Force (N/kg)")) {
        const force = metrics?.peak_force || metrics?.force_peak || 0;
        const mass = metrics?.body_mass || 0;
        value = mass > 0 ? force / mass : 0;
      } else {
        // Check if it's a dynamic metric from test_data
        if (parsedMetric) {
            // Map common metric variations to actual test_data metric keys
          const metricKeyMap: Record<string, string[]> = {
            'Jump Height (cm)': ['jump_height_ft', 'jump_height'],
            'Peak Power (W)': ['peak_power'],
            'Power (W)': ['peak_power', 'power'],
            'Reactive Strength Index': ['rsi', 'reactive_strength_index'],
            'Flight Time (ms)': ['flight_time'],
            'Contact Time (ms)': ['contact_time'],
            'Average Propulsive Power (W)': ['avg_propulsive_power', 'average_propulsive_power'],
            'Average Rate of Force Development (W)': ['avg_rfd', 'average_rfd'],
            'Take-off Velocity (m/s)': ['takeoff_velocity', 'take_off_velocity']
          };
          
          const possibleKeys = metricKeyMap[parsedMetric] || [parsedMetric.toLowerCase().replace(/[^a-z0-9]/g, '_')];
          
          for (const key of possibleKeys) {
            if (metrics?.[key] !== undefined && metrics[key] !== null) {
              value = Number(metrics[key]);
              // Convert ft to cm for jump height
              if (key === 'jump_height_ft') {
                value = value * 30.48;
              }
              break;
            }
          }
        }
      }
      
      if (value && value > 0) {
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
            name={metricType}
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.type === "elite" ? "hsl(45, 93%, 47%)" : "#374151"} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};