import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TestData } from "@/types/forcePlateTypes";
import { IndividualFilters } from "./filters/IndividualFilters";

interface IndividualComparisonSectionProps {
  data: TestData[];
  resetFiltersKey: number;
  selectedTeams: string[];
}

export const IndividualComparisonSection = ({ data, resetFiltersKey, selectedTeams }: IndividualComparisonSectionProps) => {
  // INDEPENDENT FILTER STATE - each instance manages its own state
  const [filters, setFilters] = useState({
    selectedAthletes: [],
    testDates: "",
    testNames: "",
    metricTypes: ""
  });

  // State for editable button text
  const [isEditing, setIsEditing] = useState(false);
  const [currentButtonText, setCurrentButtonText] = useState("Individual / Between Limb Comparisons");

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      selectedAthletes: [],
      testDates: "",
      testNames: "",
      metricTypes: ""
    });
    // eslint-disable-next-line
  }, [resetFiltersKey]);

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

  // Internal test select handler - only updates this component's state
  const handleTestSelect = (testName: string) => {
    setFilters(prev => ({
      ...prev,
      testNames: testName
    }));
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

        {/* Individual Filters - using independent state */}
        <IndividualFilters 
          data={data} 
          allData={data} 
          selectedTeams={selectedTeams} 
          filters={filters} 
          setFilters={setFilters} 
          onTestSelect={handleTestSelect} 
          resetFiltersKey={resetFiltersKey} 
        />

        {/* Charts - Side by Side Layout */}
        <div className="flex flex-col md:flex-row gap-8 mt-2">
          <div className="flex-1 min-w-0">
            <div className="bg-transparent rounded-lg h-[480px] min-h-[370px] max-h-[480px] overflow-y-auto flex flex-col" style={{
              boxSizing: "border-box"
            }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 h-full">
                {/* Left Side: Limb Symmetry Bar Chart */}
                <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200 shrink-0">
                    <h3 className="text-lg font-semibold">Limb Symmetry (Left vs Right)</h3>
                  </div>
                  <div className="p-3 flex-1">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                        <BarChart
                          data={limbSymmetryData}
                          layout="horizontal"
                          margin={{ top: 10, right: 15, left: 15, bottom: 10 }}
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
                <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
                  <div className="p-4 border-b border-gray-200 shrink-0">
                    <h3 className="text-lg font-semibold">Individual Athlete Progression</h3>
                  </div>
                  <div className="p-3 flex-1">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                        <LineChart
                          data={progressionData}
                          margin={{ top: 10, right: 15, left: 15, bottom: 10 }}
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
        </div>
      </CardContent>
    </Card>
  );
};