
import { Card, CardContent } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";
import { Activity, BarChart3, Zap, Clock, TrendingUp, Target } from "lucide-react";

interface MetricCardsProps {
  selectedTest: string;
  data: TestData[];
}

export const MetricCards = ({ selectedTest, data }: MetricCardsProps) => {
  // Filter data by selected test
  const filteredData = selectedTest 
    ? data.filter(d => d.test_name === selectedTest)
    : [];

  // Calculate average metrics if data exists
  const getAverageMetric = (metricKey: string) => {
    if (filteredData.length === 0) return null;
    
    const values = filteredData
      .map(d => d.metrics)
      .filter(m => m && typeof m === 'object' && metricKey in m)
      .map(m => (m as any)[metricKey])
      .filter(v => typeof v === 'number' && !isNaN(v));
    
    if (values.length === 0) return null;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  // Define metric configurations based on test type
  const getMetricConfig = () => {
    if (!selectedTest || filteredData.length === 0) {
      return [
        { icon: BarChart3, title: "Select Test Name", primary: "No Data", secondary: "Available", change: "", color: "gray" },
        { icon: Activity, title: "Select Test Name", primary: "No Data", secondary: "Available", change: "", color: "gray" },
        { icon: TrendingUp, title: "Select Test Name", primary: "No Data", secondary: "Available", change: "", color: "gray" },
        { icon: Clock, title: "Select Test Name", primary: "No Data", secondary: "Available", change: "", color: "gray" }
      ];
    }

    // Check if it's a jump test
    if (selectedTest.toLowerCase().includes('jump') || selectedTest.toLowerCase().includes('cmj') || selectedTest.toLowerCase().includes('squat')) {
      return [
        {
          icon: Zap,
          title: `${selectedTest} - Force`,
          primary: getAverageMetric('peak_force'),
          secondary: getAverageMetric('avg_propulsive_force'),
          unit: "N",
          change: "",
          color: "blue"
        },
        {
          icon: TrendingUp, 
          title: `${selectedTest} - Height`,
          primary: getAverageMetric('jump_height_ft'),
          secondary: getAverageMetric('flight_time'),
          unit: "ft / ms",
          change: "",
          color: "green"
        },
        {
          icon: Activity,
          title: `${selectedTest} - Power`, 
          primary: getAverageMetric('peak_power'),
          secondary: getAverageMetric('avg_propulsive_power'),
          unit: "W",
          change: "",
          color: "purple"
        },
        {
          icon: Clock,
          title: `${selectedTest} - Time`,
          primary: getAverageMetric('contact_time'),
          secondary: getAverageMetric('time_to_peak_force'),
          unit: "ms",
          change: "",
          color: "orange"
        }
      ];
    }

    // Check if it's an isometric test
    if (selectedTest.toLowerCase().includes('isometric')) {
      return [
        {
          icon: Zap,
          title: `${selectedTest} - Peak Force`,
          primary: getAverageMetric('force_peak'),
          secondary: getAverageMetric('force_250ms'),
          unit: "N",
          change: "",
          color: "blue"
        },
        {
          icon: BarChart3, 
          title: `${selectedTest} - RFD`,
          primary: getAverageMetric('rfd_max'),
          secondary: getAverageMetric('rfd_250ms'),
          unit: "N/s",
          change: "",
          color: "green"
        },
        {
          icon: Target,
          title: `${selectedTest} - Early Force`, 
          primary: getAverageMetric('force_100ms'),
          secondary: getAverageMetric('force_50ms'),
          unit: "N",
          change: "",
          color: "purple"
        },
        {
          icon: TrendingUp,
          title: `${selectedTest} - Impulse`,
          primary: getAverageMetric('impulse_250ms'),
          secondary: getAverageMetric('impulse_100ms'),
          unit: "N·s",
          change: "",
          color: "orange"
        }
      ];
    }

    // Check if it's a pogo test
    if (selectedTest.toLowerCase().includes('pogo')) {
      return [
        {
          icon: Activity,
          title: `${selectedTest} - RSI`,
          primary: getAverageMetric('avg_rsi'),
          secondary: getAverageMetric('rsi'),
          unit: "",
          change: "",
          color: "blue"
        },
        {
          icon: TrendingUp, 
          title: `${selectedTest} - Height`,
          primary: getAverageMetric('avg_jump_height'),
          secondary: getAverageMetric('jump_height'),
          unit: "m",
          change: "",
          color: "green"
        },
        {
          icon: Zap,
          title: `${selectedTest} - Power`, 
          primary: getAverageMetric('avg_power'),
          secondary: getAverageMetric('power'),
          unit: "W",
          change: "",
          color: "purple"
        },
        {
          icon: Clock,
          title: `${selectedTest} - Contact Time`,
          primary: getAverageMetric('avg_contact_time'),
          secondary: getAverageMetric('contact_time'),
          unit: "ms",
          change: "",
          color: "orange"
        }
      ];
    }

    // Default fallback
    return [
      { icon: BarChart3, title: selectedTest, primary: "No Metrics", secondary: "Available", change: "", color: "gray" },
      { icon: Activity, title: selectedTest, primary: "No Metrics", secondary: "Available", change: "", color: "gray" },
      { icon: TrendingUp, title: selectedTest, primary: "No Metrics", secondary: "Available", change: "", color: "gray" },
      { icon: Clock, title: selectedTest, primary: "No Metrics", secondary: "Available", change: "", color: "gray" }
    ];
  };

  const metricCards = getMetricConfig();

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      return "N/A";
    }
    return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600" };
      case "green":
        return { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600" };
      case "purple":
        return { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600" };
      case "orange":
        return { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-600" };
      default:
        return { bg: "bg-gray-50", border: "border-gray-200", icon: "text-gray-600" };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((card, index) => {
        const colors = getColorClasses(card.color);
        const IconComponent = card.icon;
        
        return (
          <Card key={index} className={`${colors.bg} ${colors.border} border-l-4 shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center ${colors.border} border`}>
                  <IconComponent className={`w-6 h-6 ${colors.icon}`} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600 leading-tight line-clamp-2">
                  {card.title}
                </h3>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatValue(card.primary, card.unit)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Secondary: {formatValue(card.secondary, card.unit)}
                  </div>
                </div>
                {card.change && (
                  <div className="text-xs text-green-600 font-medium mt-2">
                    {card.change}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
