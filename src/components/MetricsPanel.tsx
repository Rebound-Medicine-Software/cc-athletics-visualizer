
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Activity, Timer, Scale, AlertTriangle } from "lucide-react";
import { ForcePlateData } from "@/types/forcePlateTypes";
import { calculateMetrics } from "@/utils/metricsCalculator";

interface MetricsPanelProps {
  data: ForcePlateData;
}

export const MetricsPanel = ({ data }: MetricsPanelProps) => {
  const metrics = calculateMetrics(data);

  const metricCards = [
    {
      title: "Peak Force",
      value: `${metrics.peakForce.toFixed(1)} N`,
      subtitle: "Maximum vertical force",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Rate of Force Development",
      value: `${metrics.rateOfForceDevelopment.toFixed(0)} N/s`,
      subtitle: "Force generation speed",
      icon: Zap,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      title: "Impulse",
      value: `${metrics.impulse.toFixed(1)} N⋅s`,
      subtitle: "Total force over time",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Time to Weight Bearing",
      value: `${metrics.timeToWeightBearing.toFixed(2)} s`,
      subtitle: "Initial contact time",
      icon: Timer,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      title: "Average Force",
      value: `${metrics.averageForce.toFixed(1)} N`,
      subtitle: "Mean force output",
      icon: Scale,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      title: "L/R Imbalance",
      value: `${metrics.leftRightImbalance.toFixed(1)}%`,
      subtitle: "Asymmetry measure",
      icon: AlertTriangle,
      color: metrics.leftRightImbalance > 10 ? "text-orange-600" : "text-gray-600",
      bgColor: metrics.leftRightImbalance > 10 ? "bg-orange-50" : "bg-gray-50",
      borderColor: metrics.leftRightImbalance > 10 ? "border-orange-200" : "border-gray-200",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Performance Metrics</h3>
        <div className="flex space-x-2">
          <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
            Duration: {data.duration.toFixed(2)}s
          </Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
            {data.samplingRate} Hz
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric, index) => (
          <Card key={index} className={`${metric.borderColor} hover:shadow-lg transition-all bg-white/90 backdrop-blur-sm`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor} shadow-sm`}>
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metric.color} mb-1`}>
                {metric.value}
              </div>
              <p className="text-xs text-gray-500">{metric.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
