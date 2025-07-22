import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { metricCaseLogic } from "./useMetricCaseLogic";

interface LimbSymmetryChartProps {
  data: TestData[];
  testName?: string;
  metricType?: string;
}

export const LimbSymmetryChart = ({ data, testName, metricType }: LimbSymmetryChartProps) => {
  // Calculate limb symmetry based on test name and metric type
  const calculateLimbSymmetry = () => {
    if (!data || data.length === 0 || !testName || !metricType) {
      return null;
    }

    // Filter data for the selected test and dual leg stance
    const relevantData = data.filter(test => test.test_name === testName);
    
    if (relevantData.length === 0) {
      return null;
    }

    let symmetryValue = 0;
    let leftValue = 0;
    let rightValue = 0;

    // Calculate limb symmetry based on test name and metric type
    switch (testName) {
      case "Drop Jump":
        if (["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"].includes(metricType)) {
          // Extract p1_avg_force and p2_avg_force from the metrics
          const dualLegTests = relevantData.filter(test => (test.metrics as any)?.leg_stance === "dual_leg");
          
          if (dualLegTests.length > 0) {
            // Calculate average of left-right difference as percentage
            let totalDiff = 0;
            let count = 0;
            
            dualLegTests.forEach(test => {
              const left = (test.metrics as any)?.p1_avg_force;
              const right = (test.metrics as any)?.p2_avg_force;
              
              if (left !== undefined && right !== undefined) {
                leftValue = left;
                rightValue = right;
                const avg = (left + right) / 2;
                const diff = Math.abs(left - right);
                const percentage = (diff / avg) * 100;
                totalDiff += percentage;
                count++;
              }
            });
            
            if (count > 0) {
              symmetryValue = 100 - (totalDiff / count);
            }
          }
        }
        break;
        
      case "Countermovement Jump":
        if (["Jump Height (cm)", "Peak Power", "Relative Peak Power", "Reactive Strength Index"].includes(metricType)) {
          // Similar calculation as Drop Jump
          const dualLegTests = relevantData.filter(test => (test.metrics as any)?.leg_stance === "dual_leg");
          
          if (dualLegTests.length > 0) {
            let totalDiff = 0;
            let count = 0;
            
            dualLegTests.forEach(test => {
              const left = (test.metrics as any)?.p1_avg_force;
              const right = (test.metrics as any)?.p2_avg_force;
              
              if (left !== undefined && right !== undefined) {
                leftValue = left;
                rightValue = right;
                const avg = (left + right) / 2;
                const diff = Math.abs(left - right);
                const percentage = (diff / avg) * 100;
                totalDiff += percentage;
                count++;
              }
            });
            
            if (count > 0) {
              symmetryValue = 100 - (totalDiff / count);
            }
          }
        }
        break;
        
      case "Squat Jump":
        if (["Jump Height (cm)", "Take-off Velocity", "Average Rate of Force Development", "Average Propulsive Power"].includes(metricType)) {
          // Similar calculation
          const dualLegTests = relevantData.filter(test => (test.metrics as any)?.leg_stance === "dual_leg");
          
          if (dualLegTests.length > 0) {
            let totalDiff = 0;
            let count = 0;
            
            dualLegTests.forEach(test => {
              const left = (test.metrics as any)?.p1_avg_force;
              const right = (test.metrics as any)?.p2_avg_force;
              
              if (left !== undefined && right !== undefined) {
                leftValue = left;
                rightValue = right;
                const avg = (left + right) / 2;
                const diff = Math.abs(left - right);
                const percentage = (diff / avg) * 100;
                totalDiff += percentage;
                count++;
              }
            });
            
            if (count > 0) {
              symmetryValue = 100 - (totalDiff / count);
            }
          }
        }
        break;
        
      case "Pogo Jump":
        if (["Jump Height (cm)", "Power", "Flight Time", "Reactive Strength Index"].includes(metricType)) {
          // For Pogo Jump, use fp1_avg_rfd and fp2_avg_rfd
          const relevantTests = relevantData.filter(test => (test.metrics as any)?.stance === "dual_leg");
          
          if (relevantTests.length > 0) {
            let totalDiff = 0;
            let count = 0;
            
            relevantTests.forEach(test => {
              const left = (test.metrics as any)?.fp1_avg_rfd;
              const right = (test.metrics as any)?.fp2_avg_rfd;
              
              if (left !== undefined && right !== undefined) {
                leftValue = left;
                rightValue = right;
                const avg = (left + right) / 2;
                const diff = Math.abs(left - right);
                const percentage = (diff / avg) * 100;
                totalDiff += percentage;
                count++;
              }
            });
            
            if (count > 0) {
              symmetryValue = 100 - (totalDiff / count);
            }
          }
        }
        break;
        
      default:
        // For other tests like isometric tests
        if (["Maximum Rate of Force Development", "Force at Max Rate of Force Development", "Peak Force"].includes(metricType)) {
          const dualLegTests = relevantData.filter(test => (test.metrics as any)?.stance === "dual_leg");
          
          if (dualLegTests.length > 0) {
            let totalDiff = 0;
            let count = 0;
            
            dualLegTests.forEach(test => {
              const left = (test.metrics as any)?.force_peak_left;
              const right = (test.metrics as any)?.force_peak_right;
              
              if (left !== undefined && right !== undefined) {
                leftValue = left;
                rightValue = right;
                const avg = (left + right) / 2;
                const diff = Math.abs(left - right);
                const percentage = (diff / avg) * 100;
                totalDiff += percentage;
                count++;
              }
            });
            
            if (count > 0) {
              symmetryValue = 100 - (totalDiff / count);
            }
          }
        }
        break;
    }

    // Return symmetry data for chart
    return {
      symmetryValue,
      leftValue,
      rightValue
    };
  };

  const symmetryData = calculateLimbSymmetry();
  
  // Prepare data for horizontal bar chart
  const chartData = symmetryData ? [
    {
      name: "Left",
      value: symmetryData.leftValue,
      fill: "#3b82f6" // blue-500
    },
    {
      name: "Right",
      value: symmetryData.rightValue,
      fill: "#ef4444" // red-500
    }
  ] : [];

  // Calculate symmetry index (0-100%)
  const symmetryIndex = symmetryData?.symmetryValue || 0;
  
  // Determine color based on symmetry value
  const getSymmetryColor = (value: number) => {
    if (value >= 95) return "#10b981"; // green-500 - excellent
    if (value >= 90) return "#22c55e"; // green-600 - very good
    if (value >= 85) return "#84cc16"; // lime-500 - good
    if (value >= 80) return "#eab308"; // yellow-500 - acceptable
    if (value >= 75) return "#f97316"; // orange-500 - concerning
    return "#ef4444"; // red-500 - poor
  };

  if (!symmetryData) {
    return (
      <Card className="bg-white border border-teal-200 rounded-lg shadow h-full w-full">
        <CardHeader>
          <CardTitle className="text-center text-lg text-gray-800">
            Limb Symmetry Index
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500">Select a test and metric type to view limb symmetry.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-teal-200 rounded-lg shadow h-full w-full">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">
          Limb Symmetry Index{metricType ? ` - ${metricType}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Symmetry Index:</span>
            <span 
              className="text-xl font-bold" 
              style={{ color: getSymmetryColor(symmetryIndex) }}
            >
              {symmetryIndex.toFixed(1)}%
            </span>
          </div>
          <div 
            className="w-full h-6 bg-gray-200 rounded-full overflow-hidden"
          >
            <div 
              className="h-full rounded-full" 
              style={{ 
                width: `${Math.min(symmetryIndex, 100)}%`,
                backgroundColor: getSymmetryColor(symmetryIndex)
              }}
            ></div>
          </div>
        </div>
        
        <div className="h-60 w-full mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <XAxis type="number" domain={[0, 'dataMax']} />
              <YAxis dataKey="name" type="category" />
              <Tooltip
                formatter={(value: any) => [`${value.toFixed(2)}`, "Force"]}
                contentStyle={{ borderRadius: 8 }}
              />
              <ReferenceLine x={0} stroke="#666" />
              <Bar dataKey="value" name="Force" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Based on {testName || "selected test"}</p>
          <p className="mt-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> Left
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mx-1 ml-4"></span> Right
          </p>
        </div>
      </CardContent>
    </Card>
  );
};