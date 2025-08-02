
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "../ComparisonChart";
import { VideoBox } from "../VideoBox";
import { IndividualFilters } from "./IndividualFilters";
import { TestData } from "@/types/forcePlateTypes";
import { Input } from "@/components/ui/input";

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
    selectedAthletes: [],
    testDates: "",
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
      testDates: "",
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
      const dateMatch = !filters.testDates || test.test_date === filters.testDates;
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

        {/* Individual Filters - matching exact IndividualComparisonSection styling */}
        <IndividualFilters 
          data={data} 
          allData={allData} 
          selectedTeams={selectedTeams} 
          filters={filters} 
          setFilters={setFilters} 
          onTestSelect={handleTestSelect} 
          resetFiltersKey={resetFiltersKey} 
        />

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
