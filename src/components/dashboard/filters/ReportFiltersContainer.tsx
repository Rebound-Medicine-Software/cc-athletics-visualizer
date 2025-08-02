
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "../ComparisonChart";
import { VideoBox } from "../VideoBox";
import { IndividualFilters } from "./IndividualFilters";
import { TestData } from "@/types/forcePlateTypes";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { formatDate } from "@/utils/dateUtils";
import { getMetricTypesForTest } from "./filterUtils";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
  selectedTeams: string[];
  buttonText?: string;
}

export function ReportFiltersContainer({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
  selectedTeams = [],
  buttonText = "Please Select a 'Test Name'"
}: ReportFiltersProps) {
  // INDEPENDENT FILTER STATE - each instance manages its own state
  const [filters, setFilters] = useState({
    selectedAthletes: [] as string[],
    testDates: [] as string[], // Changed to array for multi-select
    testNames: "",
    metricTypes: ""
  });

  // State for editable button text - initialize with prop only once
  const [isEditing, setIsEditing] = useState(false);
  const [currentButtonText, setCurrentButtonText] = useState(buttonText);

  // Only set initial text once when component mounts
  useEffect(() => {
    setCurrentButtonText(buttonText);
  }, []); // Remove buttonText dependency to prevent overwrites

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      selectedAthletes: [],
      testDates: [], // Array for multi-select
      testNames: "",
      metricTypes: ""
    });
    onTestSelect("");
    // eslint-disable-next-line
  }, [resetFiltersKey]);

  // Chart Data - filtered by this component's own filter state
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = !filters.testNames || test.test_name === filters.testNames;
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = filters.testDates.length === 0 || filters.testDates.includes(test.test_date);
      return testMatch && athleteMatch && dateMatch;
    });
  };

  // Internal test select handler - only updates this component's state
  const handleTestSelect = (testName: string) => {
    setFilters(prev => ({
      ...prev,
      testNames: testName
    }));
    onTestSelect(testName);
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
      // Reset to current value instead of prop
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

        {/* Individual Filters - using exact IndividualComparisonSection dropdown structure */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Test Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select 
              value={filters.testNames} 
              onValueChange={(value) => {
                setFilters(prev => ({
                  ...prev,
                  testNames: value,
                  selectedAthletes: [],
                  testDates: [], // Reset to empty array
                  metricTypes: ""
                }));
                onTestSelect(value);
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {Array.from(new Set(allData.filter(d => 
                  selectedTeams.length === 0 || selectedTeams.includes(d.team_name)
                ).map(d => d.test_name))).filter(t => t !== "All Tests" && t !== "Isometric Test").map(testName => (
                  <SelectItem key={testName} value={testName}>
                    {testName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Athlete Name - Multi-Select */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            {!filters.testNames ? (
              <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                Select Athletes
              </div>
            ) : (
              <MultiSelectDropdown
                options={Array.from(new Set(
                  allData.filter(d => 
                    (selectedTeams.length === 0 || selectedTeams.includes(d.team_name)) &&
                    (!filters.testNames || d.test_name === filters.testNames)
                  ).map(d => d.athlete_name)
                )).map(name => ({ value: name, label: name }))}
                value={filters.selectedAthletes}
                onChange={(values) => {
                  setFilters(prev => ({
                    ...prev,
                    selectedAthletes: values,
                    testDates: [],
                    metricTypes: ""
                  }));
                }}
                placeholder="Select Athletes"
                className="bg-white"
                labelClassName="bg-white"
              />
            )}
          </div>

          {/* Test Date - Multi-Select */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date</label>
            {filters.selectedAthletes.length === 0 ? (
              <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                Select Dates
              </div>
            ) : (
              <MultiSelectDropdown
                options={Array.from(new Set(
                  allData.filter(d => 
                    (selectedTeams.length === 0 || selectedTeams.includes(d.team_name)) &&
                    (!filters.testNames || d.test_name === filters.testNames) &&
                    (filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(d.athlete_name))
                  ).map(d => d.test_date)
                )).sort().map(date => ({ value: date, label: formatDate(date) }))}
                value={filters.testDates}
                onChange={(values) => {
                  setFilters(prev => ({
                    ...prev,
                    testDates: values,
                    metricTypes: ""
                  }));
                }}
                placeholder="Select Dates"
                className="bg-white"
                labelClassName="bg-white"
              />
            )}
          </div>

          {/* Metric Type */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select 
              value={filters.metricTypes} 
              onValueChange={(value) => {
                setFilters(prev => ({
                  ...prev,
                  metricTypes: value
                }));
              }}
              disabled={filters.testDates.length === 0}
            >
              <SelectTrigger className={`${filters.testDates.length === 0 ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {getMetricTypesForTest(filters.testNames).map(metricType => (
                  <SelectItem key={metricType} value={metricType}>
                    {metricType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metric Cards */}
        {metricCardsSlot && (
          <div className="mb-6">
            {metricCardsSlot}
          </div>
        )}

        {/* Chart and Video */}
        <div className="flex flex-col md:flex-row gap-8 mt-2">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div className="bg-transparent rounded-lg h-[480px] min-h-[370px] max-h-[480px] overflow-y-auto flex flex-col" style={{
              boxSizing: "border-box"
            }}>
              <ComparisonChart 
                data={getFilteredDataForChart()} 
                testName={filters.testNames} 
                metricType={filters.metricTypes} 
              />
            </div>
          </div>
          {/* Video box */}
          <div className="w-full md:w-[420px] shrink-0">
            <VideoBox testName={filters.testNames} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Re-export under old name for compatibility
export { ReportFiltersContainer as ReportFilters };
