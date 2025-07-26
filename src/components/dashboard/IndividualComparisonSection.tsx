import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TestData } from "@/types/forcePlateTypes";
import { getUniqueAthleteNames, getUniqueTestNames, getUniqueTestDates, getMetricTypesForTest } from "./filters/filterUtils";

interface IndividualComparisonSectionProps {
  data: TestData[];
  resetFiltersKey: number;
  selectedTeams: string[];
}

export const IndividualComparisonSection = ({ data, resetFiltersKey, selectedTeams }: IndividualComparisonSectionProps) => {
  // Filter state
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [selectedTestName, setSelectedTestName] = useState<string>("");
  const [selectedMetricType, setSelectedMetricType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // State for editable button text
  const [isEditing, setIsEditing] = useState(false);
  const [currentButtonText, setCurrentButtonText] = useState("Individual / Between Limb Comparisons");

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setSelectedAthlete("");
    setSelectedTestName("");
    setSelectedMetricType("");
    setSelectedDate("");
  }, [resetFiltersKey]);

  // Get unique values for dropdowns
  const athletes = getUniqueAthleteNames(data);
  const testNames = getUniqueTestNames(data);
  const dates = getUniqueTestDates(data);
  const metricTypes = selectedTestName ? getMetricTypesForTest(selectedTestName) : [];

  // Calculate limb symmetry data
  const calculateLimbSymmetry = () => {
    if (!selectedAthlete || !selectedTestName || !selectedMetricType || !selectedDate) {
      return { leftPercentage: 0, rightPercentage: 0 };
    }

    // Find the specific test data
    const testData = data.find(d => 
      d.athlete_name === selectedAthlete &&
      d.test_name === selectedTestName &&
      d.test_date === selectedDate
    );

    if (!testData) {
      return { leftPercentage: 0, rightPercentage: 0 };
    }

    let leftValue = 0;
    let rightValue = 0;

    // Apply the logic based on test type and metric
    if (selectedTestName === "Drop Jump" || selectedTestName === "Countermovement Jump" || selectedTestName === "Squat Jump") {
      // Use p1_avg_force vs p2_avg_force (but these don't exist in our current data structure)
      // For now, use available force plate data
      if (testData.metrics && 'fp1_peak_force' in testData.metrics && 'fp2_peak_force' in testData.metrics) {
        leftValue = Number(testData.metrics.fp1_peak_force) || 0;
        rightValue = Number(testData.metrics.fp2_peak_force) || 0;
      }
    } else if (selectedTestName === "Pogo Jump") {
      // Use fp1_avg_rfd vs fp2_avg_rfd
      if (testData.metrics && 'fp1_avg_rfd' in testData.metrics && 'fp2_avg_rfd' in testData.metrics) {
        leftValue = Number(testData.metrics.fp1_avg_rfd) || 0;
        rightValue = Number(testData.metrics.fp2_avg_rfd) || 0;
      }
    } else {
      // Default case: Maximum RFD, Force at Max RFD, Peak Force
      if (testData.metrics && 'fp1_peak_force' in testData.metrics && 'fp2_peak_force' in testData.metrics) {
        leftValue = Number(testData.metrics.fp1_peak_force) || 0;
        rightValue = Number(testData.metrics.fp2_peak_force) || 0;
      }
    }

    const total = leftValue + rightValue;
    if (total === 0 || !isFinite(total)) {
      return { leftPercentage: 0, rightPercentage: 0 };
    }

    const leftPercentage = (leftValue / total) * 100;
    const rightPercentage = (rightValue / total) * 100;

    // Ensure values are finite and not NaN
    return { 
      leftPercentage: isFinite(leftPercentage) ? leftPercentage : 0, 
      rightPercentage: isFinite(rightPercentage) ? rightPercentage : 0 
    };
  };

  const { leftPercentage, rightPercentage } = calculateLimbSymmetry();

  // Chart data for horizontal bar - ensure no NaN values
  const chartData = [
    {
      category: "Limb Distribution",
      leftPercentage: isFinite(leftPercentage) ? leftPercentage : 0,
      rightPercentage: isFinite(rightPercentage) ? rightPercentage : 0,
    }
  ];

  const chartConfig = {
    leftPercentage: {
      label: "Left Limb %",
      color: "#000000", // Black
    },
    rightPercentage: {
      label: "Right Limb %", 
      color: "#60A5FA", // Light blue
    },
  };

  // Handle button text editing
  const handleButtonClick = () => {
    setIsEditing(true);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Custom tooltip to show percentages inside bars
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow">
          <p className="text-sm">{`${payload[0].name}: ${payload[0].value.toFixed(2)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          {isEditing ? (
            <form onSubmit={handleTextSubmit} className="w-auto min-w-[220px]">
              <Input
                value={currentButtonText}
                onChange={(e) => setCurrentButtonText(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={handleKeyDown}
                className="text-center text-lg font-semibold bg-teal-600 text-white border-teal-700 focus:border-teal-500 focus:ring-teal-500"
                autoFocus
              />
            </form>
          ) : (
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center cursor-pointer"
              onClick={handleButtonClick}
            >
              {currentButtonText}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
            <SelectTrigger>
              <SelectValue placeholder="Select Athlete" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((athlete) => (
                <SelectItem key={athlete} value={athlete}>
                  {athlete}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTestName} onValueChange={setSelectedTestName}>
            <SelectTrigger>
              <SelectValue placeholder="Select Test Name" />
            </SelectTrigger>
            <SelectContent>
              {testNames.map((testName) => (
                <SelectItem key={testName} value={testName}>
                  {testName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMetricType} onValueChange={setSelectedMetricType}>
            <SelectTrigger>
              <SelectValue placeholder="Select Metric Type" />
            </SelectTrigger>
            <SelectContent>
              {metricTypes.map((metricType) => (
                <SelectItem key={metricType} value={metricType}>
                  {metricType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger>
              <SelectValue placeholder="Select Date" />
            </SelectTrigger>
            <SelectContent>
              {dates.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-black"></div>
            <span className="text-sm font-medium">Left Limb %</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400"></div>
            <span className="text-sm font-medium">Right Limb %</span>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Limb Symmetry Distribution</h3>
          <div className="h-[200px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="category" type="category" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leftPercentage" stackId="limb" fill="#000000" />
                  <Bar dataKey="rightPercentage" stackId="limb" fill="#60A5FA" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          
          {/* Percentage labels */}
          {(leftPercentage > 0 || rightPercentage > 0) && (
            <div className="flex justify-center mt-4 gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-black">{leftPercentage.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Left Limb</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{rightPercentage.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Right Limb</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};