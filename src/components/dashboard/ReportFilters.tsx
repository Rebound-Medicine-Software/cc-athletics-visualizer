
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { TestData } from "@/types/forcePlateTypes";
import { ComparisonChart } from "./ComparisonChart";
import { formatDate } from "@/utils/dateUtils";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
}

export const ReportFilters = ({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
}: ReportFiltersProps) => {
  // FILTER STATE
  const [filters, setFilters] = useState({
    selectedAthletes: [] as string[],
    testDates: [] as string[],
    testNames: [] as string[],
    metricTypes: [] as string[]
  });

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      selectedAthletes: [],
      testDates: [],
      testNames: [],
      metricTypes: []
    });
    onTestSelect("");
  }, [resetFiltersKey, onTestSelect]);

  // --- Interconnected Filtering Logic ---
  // Calculate available options based on current filter state
  const filtered = data.filter(d =>
    (filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(d.athlete_name)) &&
    (filters.testDates.length === 0 || filters.testDates.includes(d.test_date)) &&
    (filters.testNames.length === 0 || filters.testNames.includes(d.test_name))
  );

  // Unique values for each filter, only from the current selection
  const uniqueAthletes = Array.from(new Set(filtered.map(d => d.athlete_name)));
  const uniqueTestDates = Array.from(new Set(filtered.map(d => d.test_date))).sort();
  const uniqueTestNames = Array.from(new Set(filtered.map(d => d.test_name)))
    .filter(test => test !== "All Tests" && test !== "Isometric Test");

  // Metric types depend on the *selected* test(s) (union of sets)
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
  if (filters.testNames.length === 0) {
    availableMetricTypes = [];
  } else {
    // Union of metric types for all selected tests (prevent duplicates)
    const typeSet = new Set<string>();
    filters.testNames.forEach(testName => {
      getMetricTypesForTest(testName).forEach(mt => typeSet.add(mt));
    });
    availableMetricTypes = Array.from(typeSet);
  }

  // --- DROPDOWN CHANGE HANDLERS ---
  const handleAthleteChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedAthletes: next,
    }));
  };
  const handleDateChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      testDates: next,
    }));
  };
  const handleTestNameChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      testNames: next,
      metricTypes: [] // Reset metricTypes if tests changed
    }));
    // Select the first if user only picks one test, else clear selection
    if (next.length === 1) {
      onTestSelect(next[0]);
    } else {
      onTestSelect("");
    }
  };
  const handleMetricTypeChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      metricTypes: next,
    }));
  };

  // --- Compute filtered data for chart ---
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = filters.testNames.length === 0 || filters.testNames.includes(test.test_name);
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = filters.testDates.length === 0 || filters.testDates.includes(test.test_date);
      return testMatch && athleteMatch && dateMatch;
    });
  };

  // --- Convert to MultiSelectDropdown format ---
  const athleteOptions = uniqueAthletes.map(a => ({ value: a, label: a }));
  const dateOptions = uniqueTestDates.map(d => ({ value: d, label: formatDate(d) }));
  const testNameOptions = uniqueTestNames.map(t => ({ value: t, label: t }));
  const metricTypeOptions = availableMetricTypes.map(m => ({ value: m, label: m }));

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* 1. Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center">
            Individual Filters
          </Button>
        </div>

        {/* 2. Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 justify-items-center items-end">
          {/* Athlete Name */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.selectedAthletes}
              onChange={handleAthleteChange}
              placeholder="All Athletes"
              className="text-center"
              labelClassName="bg-white"
            />
          </div>

          {/* Test Date(s) */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date(s)</label>
            <MultiSelectDropdown
              options={dateOptions}
              value={filters.testDates}
              onChange={handleDateChange}
              placeholder="All Dates"
              className="text-center"
              labelClassName="bg-white"
            />
          </div>

          {/* Test Name */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <MultiSelectDropdown
              options={testNameOptions}
              value={filters.testNames}
              onChange={handleTestNameChange}
              placeholder="Select Test"
              className="text-center"
              labelClassName="bg-white"
            />
          </div>
          {/* Metric Type */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <MultiSelectDropdown
              options={metricTypeOptions}
              value={filters.metricTypes}
              onChange={handleMetricTypeChange}
              placeholder="Select Metric"
              className="text-center"
              labelClassName="bg-white"
            />
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
          testName={filters.testNames.length === 1 ? filters.testNames[0] : ""}
          metricType={filters.metricTypes.length === 1 ? filters.metricTypes[0] : ""}
        />
      </CardContent>
    </Card>
  );
};

// This file is now VERY LONG! Consider refactoring it into multiple files for better readability.
