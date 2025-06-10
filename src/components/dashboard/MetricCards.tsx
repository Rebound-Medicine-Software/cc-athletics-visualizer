
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
    if (filteredData.length === 0) return 0;
    
    const values = filteredData
      .map(d => d.metrics)
      .filter(m => m && typeof m === 'object' && metricKey in m)
      .map(m => (m as any)[metricKey])
      .filter(v => typeof v === 'number');
    
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const metricCards = [
    {
      icon: "⚡",
      title: "Select Test Name",
      primary: getAverageMetric('peak_force') || 29.7,
      secondary: getAverageMetric('avg_force') || 49.8,
      change: "+40.3%"
    },
    {
      icon: "⚡", 
      title: "Select Test Name",
      primary: getAverageMetric('jump_height') || 4473,
      secondary: getAverageMetric('flight_time') || 5742,
      change: "+22.1%"
    },
    {
      icon: "⚡",
      title: "Select Test Name", 
      primary: getAverageMetric('rsi') || 4795,
      secondary: getAverageMetric('contact_time') || 7104,
      change: ""
    },
    {
      icon: "⏱️",
      title: "Select Test Name",
      primary: getAverageMetric('impulse') || 0.8,
      secondary: getAverageMetric('rate_of_force') || 1.0,
      change: "+15.6%"
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {metricCards.map((card, index) => (
        <Card key={index} className="bg-white shadow-md">
          <CardContent className="p-4 text-center">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="text-xs text-gray-600 mb-2">{card.title}</div>
            <div className="text-2xl font-bold text-gray-800">
              {typeof card.primary === 'number' 
                ? card.primary.toFixed(1) 
                : card.primary}
            </div>
            <div className="text-lg text-gray-600">
              {typeof card.secondary === 'number' 
                ? card.secondary.toFixed(1) 
                : card.secondary}
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
