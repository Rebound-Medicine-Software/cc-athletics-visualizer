import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, ReferenceArea } from "recharts";
import { getImprovementDirection } from "@/utils/metricsInfo";

export const ComparisonChart = ({
  data,
  testName,
  metricType,
}: {
  data: any[];
  testName: string;
  metricType: string;
}) => {
  // Helper: Direction for this metric (higher/lower is better)
  const direction = getImprovementDirection(metricType);

  // Extract values for this metric
  const metricVals = data
    .map(d => ({ ...d, value: Number((d.metrics as any)[metricType]) }))
    .filter(d => typeof d.value === "number" && !isNaN(d.value));

  if (!metricVals.length) {
    return <div className="text-center text-gray-500 py-4">No data for selected metric.</div>;
  }

  // Find best value (higher best or lower best)
  const bestVal = direction === "higher"
    ? Math.max(...metricVals.map(m => m.value))
    : Math.min(...metricVals.map(m => m.value));
  // For "lower is better" invert values for band/percent calc
  const valueForPercent = (v: number) =>
    direction === "higher" ? v / bestVal : bestVal / v;

  // Chart band regions - for bar overlay background
  const bands = [
    { name: "The Best", from: 0.9, to: 1, color: "#b9fbc0" }, // green
    { name: "Good", from: 0.75, to: 0.9, color: "#ffe066" }, // yellow
    { name: "Modest", from: 0.5, to: 0.75, color: "#ffd6a5" }, // orange
  ];

  return (
    <div>
      {/* Bands legend */}
      <div className="flex justify-center gap-4 mb-2">
        {bands.map(b => (
          <span key={b.name} className="flex items-center text-sm">
            <span className="w-4 h-4 rounded mr-1 inline-block" style={{ background: b.color, border: '1px solid #bbb' }} />
            {b.name}
          </span>
        ))}
      </div>
      {/* Actual chart */}
      <div className="w-full h-[320px] rounded bg-white/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={metricVals.map((val) => ({
              ...val,
              // Use percent for chart lookups
              percent: valueForPercent(val.value),
            }))}
          >
            {/* Render bands as ReferenceAreas */}
            {bands.map(band => (
              <ReferenceArea
                key={band.name}
                y1={band.from}
                y2={band.to}
                yAxisId="percent"
                stroke="none"
                fill={band.color}
                fillOpacity={0.4}
                ifOverflow="extendDomain"
              />
            ))}
            {/* Axes */}
            <YAxis
              yAxisId="percent"
              domain={[0.5, 1]}
              hide={false}
              tickFormatter={pct => `${Math.round(pct * 100)}%`}
              label={{
                value: "Performance",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <XAxis
              dataKey="athlete_name"
              angle={-25}
              textAnchor="end"
              interval={0}
              height={60}
            />
            {/* Bars/values */}
            <Bar dataKey="percent" fill="#2ec4b6" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
