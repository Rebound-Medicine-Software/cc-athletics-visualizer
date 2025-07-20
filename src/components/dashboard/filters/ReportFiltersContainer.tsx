
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "../ComparisonChart";
import { VideoBox } from "../VideoBox";
import { IndividualFilters } from "./IndividualFilters";
import { TestData } from "@/types/forcePlateTypes";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
  selectedTeams: string[];
}

export function ReportFiltersContainer({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
  selectedTeams = []
}: ReportFiltersProps) {
  // INDEPENDENT FILTER STATE - each instance manages its own state
  const [filters, setFilters] = useState({
    selectedAthlete: "", // Changed from selectedAthletes array to single string
    testDates: "",
    testNames: "",
    metricTypes: ""
  });

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      selectedAthlete: "", // Changed from selectedAthletes array to single string
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
      const athleteMatch = !filters.selectedAthlete || test.athlete_name === filters.selectedAthlete; // Changed condition
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

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center">
            Individual/Between Limb Differences
          </Button>
        </div>

        {/* Individual Filters - using independent state */}
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
