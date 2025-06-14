
import { Card, CardContent } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";

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
        { icon: "⚡", title: "Select Test Name", primary: "No Data", secondary: "Available", change: "" },
        { icon: "⚡", title: "Select Test Name", primary: "No Data", secondary: "Available", change: "" },
        { icon: "⚡", title: "Select Test Name", primary: "No Data", secondary: "Available", change: "" },
        { icon: "⏱️", title: "Select Test Name", primary: "No Data", secondary: "Available", change: "" }
      ];
    }

    // Check if it's a jump test
    if (selectedTest.toLowerCase().includes('jump') || selectedTest.toLowerCase().includes('cmj') || selectedTest.toLowerCase().includes('squat')) {
      return [
        {
          icon: "⚡",
          title: `${selectedTest} - Force`,
          primary: getAverageMetric('peak_force'),
          secondary: getAverageMetric('avg_propulsive_force'),
          unit: "N",
          change: ""
        },
        {
          icon: "📏", 
          title: `${selectedTest} - Height`,
          primary: getAverageMetric('jump_height_ft'),
          secondary: getAverageMetric('flight_time'),
          unit: "ft / ms",
          change: ""
        },
        {
          icon: "⚡",
          title: `${selectedTest} - Power`, 
          primary: getAverageMetric('peak_power'),
          secondary: getAverageMetric('avg_propulsive_power'),
          unit: "W",
          change: ""
        },
        {
          icon: "⏱️",
          title: `${selectedTest} - Time`,
          primary: getAverageMetric('contact_time'),
          secondary: getAverageMetric('time_to_peak_force'),
          unit: "ms",
          change: ""
        }
      ];
    }

    // Check if it's an isometric test
    if (selectedTest.toLowerCase().includes('isometric')) {
      return [
        {
          icon: "⚡",
          title: `${selectedTest} - Peak Force`,
          primary: getAverageMetric('force_peak'),
          secondary: getAverageMetric('force_250ms'),
          unit: "N",
          change: ""
        },
        {
          icon: "📈", 
          title: `${selectedTest} - RFD`,
          primary: getAverageMetric('rfd_max'),
          secondary: getAverageMetric('rfd_250ms'),
          unit: "N/s",
          change: ""
        },
        {
          icon: "⚡",
          title: `${selectedTest} - Early Force`, 
          primary: getAverageMetric('force_100ms'),
          secondary: getAverageMetric('force_50ms'),
          unit: "N",
          change: ""
        },
        {
          icon: "⏱️",
          title: `${selectedTest} - Impulse`,
          primary: getAverageMetric('impulse_250ms'),
          secondary: getAverageMetric('impulse_100ms'),
          unit: "N·s",
          change: ""
        }
      ];
    }

    // Check if it's a pogo test
    if (selectedTest.toLowerCase().includes('pogo')) {
      return [
        {
          icon: "⚡",
          title: `${selectedTest} - RSI`,
          primary: getAverageMetric('avg_rsi'),
          secondary: getAverageMetric('rsi'),
          unit: "",
          change: ""
        },
        {
          icon: "📏", 
          title: `${selectedTest} - Height`,
          primary: getAverageMetric('avg_jump_height'),
          secondary: getAverageMetric('jump_height'),
          unit: "m",
          change: ""
        },
        {
          icon: "⚡",
          title: `${selectedTest} - Power`, 
          primary: getAverageMetric('avg_power'),
          secondary: getAverageMetric('power'),
          unit: "W",
          change: ""
        },
        {
          icon: "⏱️",
          title: `${selectedTest} - Contact Time`,
          primary: getAverageMetric('avg_contact_time'),
          secondary: getAverageMetric('contact_time'),
          unit: "ms",
          change: ""
        }
      ];
    }

    // Default fallback
    return [
      { icon: "⚡", title: selectedTest, primary: "No Metrics", secondary: "Available", change: "" },
      { icon: "⚡", title: selectedTest, primary: "No Metrics", secondary: "Available", change: "" },
      { icon: "⚡", title: selectedTest, primary: "No Metrics", secondary: "Available", change: "" },
      { icon: "⏱️", title: selectedTest, primary: "No Metrics", secondary: "Available", change: "" }
    ];
  };

  const metricCards = getMetricConfig();

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      return "N/A";
    }
    return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {metricCards.map((card, index) => (
        <Card key={index} className="bg-white shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-xs text-gray-600 mb-2 h-8 flex items-center justify-center">
              {card.title}
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {formatValue(card.primary, card.unit)}
            </div>
            <div className="text-lg text-gray-600">
              {formatValue(card.secondary, card.unit)}
            </div>
            {card.change && (
              <div className="text-xs text-green-600 font-medium mt-1">
                {card.change}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
