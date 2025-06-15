
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea, Cell } from "recharts";

interface EliteComparisonChartProps {
  individuals: { name: string; value: number; team?: string }[];
  eliteValue: number | null;
  metricType: string;
}

export const EliteComparisonChart: React.FC<EliteComparisonChartProps> = ({
  individuals,
  eliteValue,
  metricType,
}) => {
  // Compose chart data: individuals to left, elite value far right
  const chartData = [
    ...individuals,
    ...(eliteValue !== null
      ? [
          {
            name: "Elite Benchmark",
            value: eliteValue,
            team: null,
            elite: true,
          },
        ]
      : []),
  ];

  // Get max/min for bands
  const reference = eliteValue || 0;
  const bands = [
    {
      name: "Elite",
      color: "#FFD700",
      from: reference * 0.90,
      to: reference,
    },
    {
      name: "Sub-Elite",
      color: "#FFF475",
      from: reference * 0.75,
      to: reference * 0.90,
    },
    {
      name: "Amateur",
      color: "#FEEBC8",
      from: reference * 0.5,
      to: reference * 0.75,
    },
  ];

  return (
    <Card className="bg-white border-amber-200 mt-0">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">
          Comparison to Elite Benchmark
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
              {/* Achievement bands */}
              {reference > 0 &&
                bands.map(band => (
                  <ReferenceArea
                    key={band.name}
                    y1={band.from}
                    y2={band.to}
                    label={null}
                    fill={band.color}
                    fillOpacity={0.65}
                    stroke="none"
                    ifOverflow="extendDomain"
                  />
                ))}
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
                  value: metricType || "Value",
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
                name={metricType || "Value"}
                radius={[4, 4, 0, 0]}
                >
                {chartData.map((e, i) =>
                  e.elite
                    ? <Cell key={`cell-${i}`} fill="#FFD700" />
                    : <Cell key={`cell-${i}`} fill="#374151" />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-3 mt-2 items-center justify-center text-xs">
            <span className="flex items-center">
              <span className="w-4 h-3 rounded mr-1" style={{ background: "#FFD700" }}></span> Elite (90-100%)
            </span>
            <span className="flex items-center">
              <span className="w-4 h-3 rounded mr-1" style={{ background: "#FFF475" }}></span> Sub-Elite (75-90%)
            </span>
            <span className="flex items-center">
              <span className="w-4 h-3 rounded mr-1" style={{ background: "#FEEBC8" }}></span> Amateur (50-75%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
