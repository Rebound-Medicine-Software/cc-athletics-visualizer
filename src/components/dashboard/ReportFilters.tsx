import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { ComparisonChart } from "./ComparisonChart";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode; // <-- add slot for metric cards
}

export const ReportFilters = ({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
}: ReportFiltersProps) => {
  // FILTER STATE
  const [filters, setFilters] = useState({
    selectedAthletes: [] as string[],
    testDates: [] as string[],
    testName: "",
    metricType: ""
  });

  // Unique values dependent on selections
  const filteredByTest = data.filter(d =>
    !filters.testName || d.test_name === filters.testName
  );
  const uniqueAthletes = [...new Set(filteredByTest.map(d => d.athlete_name))];

  const filteredByAthlete = filters.selectedAthletes.length === 0 ?
    filteredByTest :
    filteredByTest.filter(d => filters.selectedAthletes.includes(d.athlete_name));
  const uniqueTestDates = [...new Set(filteredByAthlete.map(d => d.test_date))].sort();

  // Show only tests in data
  const uniqueTests = [...new Set(data.map(d => d.test_name))]
    .filter(test => test !== "All Tests" && test !== "Isometric Test");

  // Metric types as before
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
  const availableMetricTypes = filters.testName ? getMetricTypesForTest(filters.testName) : [];

  // Handlers for dropdowns
  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value,
      metricType: "",
      selectedAthletes: [],
      testDates: []
    }));
    onTestSelect(value);
  };

  const handleAthleteChange = (value: string) => {
    if (value === "all") {
      setFilters(prev => ({ ...prev, selectedAthletes: [], testDates: [] }));
    } else {
      setFilters(prev => ({ ...prev, selectedAthletes: [value], testDates: [] }));
    }
  };

  const handleDateChange = (value: string) => {
    if (value === "all") {
      setFilters(prev => ({ ...prev, testDates: [] }));
    } else {
      setFilters(prev => ({ ...prev, testDates: [value] }));
    }
  };

  // DATA process for chart (send filters to chart)
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = !filters.testName || test.test_name === filters.testName;
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = filters.testDates.length === 0 || filters.testDates.includes(test.test_date);
      return testMatch && athleteMatch && dateMatch;
    });
  };

  // [NEW] Disable options if dependencies not selected
  const testNameSelected = !!filters.testName;
  const athleteSelected = filters.selectedAthletes.length > 0;
  const dateAvailable = uniqueTestDates.length > 0;

  return (
    <Card className="bg-teal-50/80 border-teal-200">
      <CardContent className="p-4">
        {/* 1. Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center">
            <span className="w-full block text-center">Individual Filters</span>
          </Button>
        </div>

        {/* 2. Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 justify-items-center items-end">
          {/* Athlete Name */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <Select
              value={filters.selectedAthletes[0] || "all"}
              onValueChange={handleAthleteChange}
              disabled={!testNameSelected}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Athletes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Athletes</SelectItem>
                {uniqueAthletes.map(athlete => (
                  <SelectItem key={athlete} value={athlete}>
                    {athlete}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Date(s) */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date(s)</label>
            <Select
              value={filters.testDates[0] || "all"}
              onValueChange={handleDateChange}
              disabled={!athleteSelected || !dateAvailable}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {uniqueTestDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Name */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select value={filters.testName} onValueChange={handleTestNameChange}>
              <SelectTrigger className="bg-black text-white border-gray-600">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent>
                {uniqueTests.map(test => (
                  <SelectItem key={test} value={test}>
                    {test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select
              value={filters.metricType}
              onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))}
              disabled={!testNameSelected}
            >
              <SelectTrigger className="bg-black text-white border-gray-600">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                {availableMetricTypes.map(metric => (
                  <SelectItem key={metric} value={metric}>
                    {metric}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          testName={filters.testName}
          metricType={filters.metricType}
        />
      </CardContent>
    </Card>
  );
};
