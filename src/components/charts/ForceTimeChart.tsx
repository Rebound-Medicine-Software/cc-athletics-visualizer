
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ForcePlateData } from "@/types/forcePlateTypes";

interface ForceTimeChartProps {
  data: ForcePlateData;
}

export const ForceTimeChart = ({ data }: ForceTimeChartProps) => {
  const chartData = data.dataPoints.map(point => ({
    time: point.time.toFixed(3),
    'Vertical Force (N)': point.forceZ,
    'Anterior-Posterior (N)': point.forceY,
    'Medial-Lateral (N)': point.forceX,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-800">Force Components Over Time</h4>
        <div className="text-sm text-slate-600">
          {data.dataPoints.length} data points • {data.samplingRate} Hz sampling
        </div>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Force (N)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Vertical Force (N)" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Anterior-Posterior (N)" 
              stroke="#dc2626" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Medial-Lateral (N)" 
              stroke="#16a34a" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
