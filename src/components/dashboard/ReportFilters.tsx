
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "./ComparisonChart";
import { formatDate } from "@/utils/dateUtils";
import { AthleteNameFilter } from "./ReportFilters/AthleteNameFilter";
import { TestDateFilter } from "./ReportFilters/TestDateFilter";
import { TestNameFilter } from "./ReportFilters/TestNameFilter";
import { MetricTypeFilter } from "./ReportFilters/MetricTypeFilter";
import { TestData } from "@/types/forcePlateTypes";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
  selectedTeams: string[];
}

export const ReportFilters = ({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
  selectedTeams = []
}: ReportFiltersProps) => {
  const [filters, setFilters] = useState({
    selectedAthletes: [] as string[],
    testDates: "",
    testNames: "",
    metricTypes: ""
  });

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      selectedAthletes: [],
      testDates: "",
      testNames: "",
      metricTypes: ""
    });
    onTestSelect("");
  }, [resetFiltersKey, onTestSelect]);

  // --- Interconnected Filtering Logic ---
  const filtered = data.filter(d =>
    (filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(d.athlete_name)) &&
    (!filters.testDates || d.test_date === filters.testDates) &&
    (!filters.testNames || d.test_name === filters.testNames)
  );

  const filteredAthleteNames = selectedTeams.length > 0
    ? Array.from(new Set(allData.filter(d => selectedTeams.includes(d.team_name)).map(d => d.athlete_name)))
    : Array.from(new Set(allData.map(d => d.athlete_name)));
  const uniqueTestDates = Array.from(new Set(filtered.map(d => d.test_date))).sort();
  const uniqueTestNames = Array.from(new Set(filtered.map(d => d.test_name)))
    .filter(test => test !== "All Tests" && test !== "Isometric Test");

  const getMetricTypesForTest = (testName: string): string[] => {
    switch (testName) {
      case "Drop Jump":
        return ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"];
      case "Countermovement Jump":
        return ["Jump Height (cm)", "Peak Power", "Relative Peak Power", "Reactive Strength Index"];
      case "Squat Jump":
        return ["Jump Height (cm)", "Take-off Velocity", "Average Rate of Force Development", "Average Propulsive Power"];
      case "Pogo Jump":
        return ["Jump Height (cm)", "Power", "Flight Time", "Reactive Strength Index"];
      default:
        return ["Maximum Rate of Force Development", "Force at Max Rate of Force Development", "Peak Force"];
    }
  };

  let availableMetricTypes: string[] = [];
  if (!filters.testNames) {
    availableMetricTypes = [];
  } else {
    availableMetricTypes = getMetricTypesForTest(filters.testNames);
  }

  // --- Compute filtered data for chart ---
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = !filters.testNames || test.test_name === filters.testNames;
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = !filters.testDates || test.test_date === filters.testDates;
      return testMatch && athleteMatch && dateMatch;
    });
  };

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* 1. Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[180px] text-lg font-semibold mx-auto justify-center block text-center">
            Individual Filters
          </Button>
        </div>
        {/* 2. Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 justify-items-center items-end">
          <AthleteNameFilter
            value={filters.selectedAthletes}
            onChange={val => setFilters(prev => ({ ...prev, selectedAthletes: val }))}
            options={filteredAthleteNames}
          />
          <TestDateFilter
            value={filters.testDates}
            onChange={val => setFilters(prev => ({ ...prev, testDates: val }))}
            options={uniqueTestDates}
            formatOption={formatDate}
          />
          <TestNameFilter
            value={filters.testNames}
            onChange={val => {
              setFilters(prev => ({ ...prev, testNames: val, metricTypes: "" }));
              onTestSelect(val);
            }}
            options={uniqueTestNames}
          />
          <MetricTypeFilter
            value={filters.metricTypes}
            onChange={val => setFilters(prev => ({ ...prev, metricTypes: val }))}
            options={availableMetricTypes}
          />
        </div>
        {/* 3. Metric Cards */}
        {metricCardsSlot && (
          <div className="mb-6">
            {metricCardsSlot}
          </div>
        )}
        {/* 4. Graph */}
        <ComparisonChart
          data={getFilteredDataForChart()}
          testName={filters.testNames}
          metricType={filters.metricTypes}
        />
      </CardContent>
    </Card>
  );
};
