
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ForcePlateData } from "@/types/forcePlateTypes";

interface Force3DChartProps {
  data: ForcePlateData;
}

export const Force3DChart = ({ data }: Force3DChartProps) => {
  // Create time-binned data for better visualization
  const binSize = Math.max(1, Math.floor(data.dataPoints.length / 50));
  const binnedData = [];
  
  for (let i = 0; i < data.dataPoints.length; i += binSize) {
    const bin = data.dataPoints.slice(i, i + binSize);
    const avgPoint = bin.reduce((acc, point) => ({
      time: acc.time + point.time / bin.length,
      forceX: acc.forceX + point.forceX / bin.length,
      forceY: acc.forceY + point.forceY / bin.length,
      forceZ: acc.forceZ + point.forceZ / bin.length,
    }), { time: 0, forceX: 0, forceY: 0, forceZ: 0 });
    
    binnedData.push({
      time: avgPoint.time.toFixed(2),
      'Vertical (Z)': Math.abs(avgPoint.forceZ),
      'A-P (Y)': Math.abs(avgPoint.forceY),
      'M-L (X)': Math.abs(avgPoint.forceX),
      resultant: Math.sqrt(avgPoint.forceX ** 2 + avgPoint.forceY ** 2 + avgPoint.forceZ ** 2),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-800">3D Force Vector Components</h4>
        <div className="text-sm text-slate-600">
          Magnitude representation (absolute values)
        </div>
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={binnedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Force Magnitude (N)', angle: -90, position: 'insideLeft' }}
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
            <Bar dataKey="Vertical (Z)" fill="#2563eb" fillOpacity={0.8} />
            <Bar dataKey="A-P (Y)" fill="#dc2626" fillOpacity={0.8} />
            <Bar dataKey="M-L (X)" fill="#16a34a" fillOpacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="font-medium text-blue-800">Peak Vertical</p>
          <p className="text-xl font-bold text-blue-600">
            {Math.max(...data.dataPoints.map(p => Math.abs(p.forceZ))).toFixed(1)} N
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <p className="font-medium text-red-800">Peak A-P</p>
          <p className="text-xl font-bold text-red-600">
            {Math.max(...data.dataPoints.map(p => Math.abs(p.forceY))).toFixed(1)} N
          </p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <p className="font-medium text-green-800">Peak M-L</p>
          <p className="text-xl font-bold text-green-600">
            {Math.max(...data.dataPoints.map(p => Math.abs(p.forceX))).toFixed(1)} N
          </p>
        </div>
      </div>
    </div>
  );
};
