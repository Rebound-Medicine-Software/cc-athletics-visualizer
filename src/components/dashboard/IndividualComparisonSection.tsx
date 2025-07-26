import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TestData } from "@/types/forcePlateTypes";
import { getUniqueTestNames, getUniqueAthleteNames, getUniqueTestDates, getMetricTypesForTest } from "./filters/filterUtils";
import { X } from "lucide-react";

interface IndividualComparisonSectionProps {
  data: TestData[];
  resetFiltersKey: number;
}

export const IndividualComparisonSection = ({ data, resetFiltersKey }: IndividualComparisonSectionProps) => {
  const [selectedTestName, setSelectedTestName] = useState<string>("");
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMetricType, setSelectedMetricType] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentButtonText, setCurrentButtonText] = useState("Individual / Between Limb Comparisons");

  // Filter data and get unique options
  const uniqueTestNames = getUniqueTestNames(data);
  const uniqueAthleteNames = getUniqueAthleteNames(data);
  const uniqueTestDates = getUniqueTestDates(data);
  const availableMetricTypes = selectedTestName ? getMetricTypesForTest(selectedTestName) : [];

  // Mock data for limb symmetry chart (Left vs Right)
  const limbSymmetryData = [
    { limb: "Left", value: 85, color: "hsl(var(--chart-1))" },
    { limb: "Right", value: 78, color: "hsl(var(--chart-2))" },
  ];

  // Mock data for athlete progression over time
  const progressionData = [
    { date: "2024-01-15", value: 82 },
    { date: "2024-02-15", value: 85 },
    { date: "2024-03-15", value: 87 },
    { date: "2024-04-15", value: 83 },
    { date: "2024-05-15", value: 89 },
  ];

  const chartConfig = {
    value: {
      label: "Value",
      color: "hsl(var(--chart-1))",
    },
    left: {
      label: "Left",
      color: "hsl(var(--chart-1))",
    },
    right: {
      label: "Right",
      color: "hsl(var(--chart-2))",
    },
  };

  const handleReset = () => {
    setSelectedTestName("");
    setSelectedAthlete("");
    setSelectedDate("");
    setSelectedMetricType("");
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

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
          {/* Test Name Filter */}
          <div className="space-y-2">
            <Label>Test Name</Label>
            <div className="flex gap-2">
              <Select value={selectedTestName} onValueChange={setSelectedTestName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueTestNames.map((testName) => (
                    <SelectItem key={testName} value={testName}>
                      {testName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTestName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTestName("")}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Athlete Name Filter */}
          <div className="space-y-2">
            <Label>Athlete Name</Label>
            <div className="flex gap-2">
              <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                <SelectTrigger>
                  <SelectValue placeholder="Select athlete" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueAthleteNames.map((athleteName) => (
                    <SelectItem key={athleteName} value={athleteName}>
                      {athleteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAthlete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAthlete("")}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Test Date Filter */}
          <div className="space-y-2">
            <Label>Test Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="Select date"
              />
              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate("")}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Metric Type Filter */}
          <div className="space-y-2">
            <Label>Metric Type</Label>
            <div className="flex gap-2">
              <Select 
                value={selectedMetricType} 
                onValueChange={setSelectedMetricType}
                disabled={!selectedTestName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {availableMetricTypes.map((metricType) => (
                    <SelectItem key={metricType} value={metricType}>
                      {metricType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMetricType && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMetricType("")}
                  className="px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Reset Button */}
          <Button variant="outline" onClick={handleReset}>
            Reset All
          </Button>
        </div>

        {/* Chart and Video */}
        <div className="flex flex-col md:flex-row gap-8 mt-2">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div className="bg-transparent rounded-lg h-[480px] min-h-[370px] max-h-[480px] overflow-y-auto flex flex-col" style={{
              boxSizing: "border-box"
            }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
                {/* Left Side: Limb Symmetry Bar Chart */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Limb Symmetry (Left vs Right)</h3>
                  </div>
                  <div className="p-4">
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={limbSymmetryData}
                          layout="horizontal"
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="limb" type="category" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>

                {/* Right Side: Individual Athlete Progression Line Chart */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Individual Athlete Progression</h3>
                  </div>
                  <div className="p-4">
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={progressionData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--chart-1))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--chart-1))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Video box */}
          <div className="w-full md:w-[420px] shrink-0">
            <div className="bg-gray-100 rounded-lg p-4 h-[480px] flex items-center justify-center">
              <span className="text-gray-500">Video Box Placeholder</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};