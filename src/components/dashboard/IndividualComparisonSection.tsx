import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Individual / Between Limb Comparisons</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Limb Symmetry Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Limb Symmetry (Left vs Right)</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Right Side: Individual Athlete Progression Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Individual Athlete Progression</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};