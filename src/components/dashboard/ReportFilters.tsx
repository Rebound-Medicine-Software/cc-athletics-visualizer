
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  // Calculate available options based on current filter state
  const filtered = data.filter(d =>
    (filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(d.athlete_name)) &&
    (!filters.testDates || d.test_date === filters.testDates) &&
    (!filters.testNames || d.test_name === filters.testNames)
  );

  // Unique values for each filter, only from the current selection
  const uniqueAthletes = Array.from(new Set(filtered.map(d => d.athlete_name)));
  const uniqueTestDates = Array.from(new Set(filtered.map(d => d.test_date))).sort();
  const uniqueTestNames = Array.from(new Set(filtered.map(d => d.test_name)))
    .filter(test => test !== "All Tests" && test !== "Isometric Test");

  // Metric types depend on selected test
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

  // --- DROPDOWN CHANGE HANDLERS ---
  const handleAthleteChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedAthletes: next,
    }));
  };
  const handleDateChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      testDates: val,
    }));
  };
  const handleTestNameChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      testNames: val,
      metricTypes: "" // Reset metricTypes if tests changed
    }));
    onTestSelect(val);
  };
  const handleMetricTypeChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      metricTypes: val,
    }));
  };

  // --- Compute filtered data for chart ---
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = !filters.testNames || test.test_name === filters.testNames;
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = !filters.testDates || test.test_date === filters.testDates;
      return testMatch && athleteMatch && dateMatch;
    });
  };

  // --- Convert to Dropdown format ---
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
          {/* Athlete Name (MultiSelect) */}
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

          {/* Test Date(s) (Single Select) */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date</label>
            <Select value={filters.testDates} onValueChange={handleDateChange}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Dates</SelectItem>
                {dateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Name (Single Select) */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select value={filters.testNames} onValueChange={handleTestNameChange}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tests</SelectItem>
                {testNameOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type (Single Select) */}
          <div className="w-full min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select value={filters.metricTypes} onValueChange={handleMetricTypeChange}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Metrics</SelectItem>
                {metricTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
          testName={filters.testNames}
          metricType={filters.metricTypes}
        />
      </CardContent>
    </Card>
  );
};

// This file is now VERY LONG! Consider refactoring it into multiple files for better readability.

