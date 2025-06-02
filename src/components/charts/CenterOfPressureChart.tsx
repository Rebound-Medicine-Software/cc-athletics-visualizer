
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ForcePlateData } from "@/types/forcePlateTypes";

interface CenterOfPressureChartProps {
  data: ForcePlateData;
}

export const CenterOfPressureChart = ({ data }: CenterOfPressureChartProps) => {
  const copData = data.dataPoints.map((point, index) => ({
    x: point.copX,
    y: point.copY,
    time: point.time,
    intensity: point.forceZ,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-800">Center of Pressure</p>
          <p className="text-blue-600">X: {data.x.toFixed(2)} mm</p>
          <p className="text-green-600">Y: {data.y.toFixed(2)} mm</p>
          <p className="text-slate-600">Time: {data.time.toFixed(3)} s</p>
          <p className="text-purple-600">Force: {data.intensity.toFixed(1)} N</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-800">Center of Pressure Trajectory</h4>
        <div className="text-sm text-slate-600">
          Force plate coordinates (mm)
        </div>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={copData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              dataKey="x" 
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Medial-Lateral (mm)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Anterior-Posterior (mm)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              dataKey="intensity" 
              fill="#3b82f6" 
              fillOpacity={0.6}
              strokeWidth={1}
              stroke="#1d4ed8"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-800">Path Length</p>
          <p className="text-blue-600">
            {copData.reduce((acc, point, index) => {
              if (index === 0) return 0;
              const prev = copData[index - 1];
              return acc + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
            }, 0).toFixed(1)} mm
          </p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="font-medium text-green-800">Sway Area</p>
          <p className="text-green-600">
            {((Math.max(...copData.map(p => p.x)) - Math.min(...copData.map(p => p.x))) * 
              (Math.max(...copData.map(p => p.y)) - Math.min(...copData.map(p => p.y)))).toFixed(1)} mm²
          </p>
        </div>
      </div>
    </div>
  );
};
