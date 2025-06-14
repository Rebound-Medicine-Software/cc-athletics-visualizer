
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

  // Unique dropdown options (cascading dependencies)
  const availableAthletes = filters.testName
    ? [...new Set(data.filter(d => d.test_name === filters.testName).map(d => d.athlete_name))]
    : [];

  const availableDates = filters.testName && filters.selectedAthletes.length > 0
    ? [
        ...new Set(
          data
            .filter(
              d =>
                d.test_name === filters.testName &&
                filters.selectedAthletes.includes(d.athlete_name)
            )
            .map(d => d.test_date)
        ),
      ].sort()
    : [];

  // Filter test names - remove "All Tests" and "Isometric Test"
  const uniqueTests = [...new Set(data.map(d => d.test_name))].filter(test => test !== "All Tests" && test !== "Isometric Test");

  // Metric types per test
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

  // Handlers for dropdowns (enforcing dependencies)
  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value,
      metricType: "",
      selectedAthletes: [],
      testDates: [],
    }));
    onTestSelect(value);
  };

  const handleAthleteChange = (value: string) => {
    if (value === "all") {
      setFilters(prev => ({ ...prev, selectedAthletes: [] }));
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
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = filters.testDates.length === 0 || filters.testDates.includes(test.test_date);
      const testMatch = !filters.testName || test.test_name === filters.testName;
      return athleteMatch && dateMatch && testMatch;
    });
  };

  return (
    <Card className="bg-teal-50/80 border-teal-200">
      <CardContent className="p-4 flex flex-col items-center">
        {/* 1. Header */}
        <div className="flex mb-4 w-full justify-center">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white text-lg font-semibold w-auto px-8">
            Individual Filters
          </Button>
        </div>

        {/* 2. Dropdown Filters Row - stack vertically and center */}
        <div className="flex flex-col gap-4 items-center mb-6 w-full max-w-3xl mx-auto">
          {/* Test Name */}
          <div className="w-full flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select value={filters.testName} onValueChange={handleTestNameChange}>
              <SelectTrigger className="bg-black text-white border-gray-600 w-60">
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
          <div className="w-full flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select
              value={filters.metricType}
              onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))}
              disabled={!filters.testName}
            >
              <SelectTrigger className="bg-black text-white border-gray-600 w-60">
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

          {/* Athlete Name */}
          <div className="w-full flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <Select
              value={filters.selectedAthletes[0] || "all"}
              onValueChange={handleAthleteChange}
              disabled={!filters.testName || !filters.metricType}
            >
              <SelectTrigger className="bg-white w-60">
                <SelectValue placeholder="All Athletes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Athletes</SelectItem>
                {availableAthletes.map(athlete => (
                  <SelectItem key={athlete} value={athlete}>
                    {athlete}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Test Date(s) */}
          <div className="w-full flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date(s)</label>
            <Select
              value={filters.testDates[0] || "all"}
              onValueChange={handleDateChange}
              disabled={!filters.testName || !filters.metricType || filters.selectedAthletes.length === 0}
            >
              <SelectTrigger className="bg-white w-60">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {availableDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 3. Metric Cards */}
        {metricCardsSlot && (
          <div className="mb-6 w-full flex justify-center">
            {metricCardsSlot}
          </div>
        )}

        {/* 4. Graph */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-3xl">
            <ComparisonChart
              data={getFilteredDataForChart()}
              testName={filters.testName}
              metricType={filters.metricType}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
