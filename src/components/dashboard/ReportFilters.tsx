import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { ComparisonChart } from "./ComparisonChart";
import { formatDate } from "@/utils/dateUtils";
import { RefreshCcw } from "lucide-react"; // Import the refresh icon
import { VideoBox } from "./VideoBox";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
  selectedTeams: string[]; // NEW
}

export const ReportFilters = ({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
  selectedTeams = []
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

  // Unique values for dropdown options
  // Athlete multi-select should ONLY include athletes found in the filtered 'data' (which is already by Team)
  const filteredAthleteNames = selectedTeams.length > 0
    ? Array.from(new Set(allData.filter(d => selectedTeams.includes(d.team_name)).map(d => d.athlete_name)))
    : Array.from(new Set(allData.map(d => d.athlete_name)));
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

  // Reset handlers for each filter
  const handleResetAthlete = () => setFilters(prev => ({ ...prev, selectedAthletes: [] }));
  const handleResetDate = () => setFilters(prev => ({ ...prev, testDates: "" }));
  const handleResetTestName = () => {
    setFilters(prev => ({ ...prev, testNames: "", metricTypes: "" }));
    onTestSelect("");
  };
  const handleResetMetricType = () => setFilters(prev => ({ ...prev, metricTypes: "" }));

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
  // Athlete dropdown options should only show athletes from the currently filtered Team
  const athleteOptions = filteredAthleteNames.map(a => ({ value: a, label: a }));
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
          <div className="w-[200px] min-w-[200px] max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <div className="flex items-center gap-2">
              <MultiSelectDropdown
                options={athleteOptions}
                value={filters.selectedAthletes}
                onChange={handleAthleteChange}
                placeholder="All Athletes"
                className="text-center"
                labelClassName="bg-white"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Athlete Name"
                className="p-2"
                onClick={handleResetAthlete}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Test Date(s) (Single Select) */}
          <div className="w-[200px] min-w-[200px] max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date</label>
            <div className="flex items-center gap-2">
              <Select value={filters.testDates} onValueChange={handleDateChange}>
                <SelectTrigger className="bg-white text-center w-full">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Test Date"
                className="p-2"
                onClick={handleResetDate}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Test Name (Single Select) */}
          <div className="w-[200px] min-w-[200px] max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <div className="flex items-center gap-2">
              <Select value={filters.testNames} onValueChange={handleTestNameChange}>
                <SelectTrigger className="bg-white text-center w-full">
                  <SelectValue placeholder="All Tests" />
                </SelectTrigger>
                <SelectContent>
                  {testNameOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Test Name"
                className="p-2"
                onClick={handleResetTestName}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Metric Type (Single Select) */}
          <div className="w-[200px] min-w-[200px] max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <div className="flex items-center gap-2">
              <Select value={filters.metricTypes} onValueChange={handleMetricTypeChange}>
                <SelectTrigger className="bg-white text-center w-full">
                  <SelectValue placeholder="All Metrics" />
                </SelectTrigger>
                <SelectContent>
                  {metricTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Metric Type"
                className="p-2"
                onClick={handleResetMetricType}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Metric Cards */}
        {metricCardsSlot && (
          <div className="mb-6">
            {metricCardsSlot}
          </div>
        )}

        {/* 4. Responsive flex to put ComparisonChart and VideoBox side by side */}
        <div className="flex flex-col md:flex-row gap-8 mt-2">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div
              className="bg-transparent rounded-lg h-[480px] min-h-[370px] max-h-[480px] overflow-y-auto flex flex-col"
              style={{
                boxSizing: "border-box",
                // Prevent shrinking if narrow, keep same as VideoBox
              }}
            >
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
};

// This file is now VERY LONG! Consider refactoring it into multiple files for better readability.
