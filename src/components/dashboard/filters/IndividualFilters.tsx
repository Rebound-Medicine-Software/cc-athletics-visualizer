
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetricTypesForTest } from "./filterUtils";
import { formatDate } from "@/utils/dateUtils";
import { RefreshCcw } from "lucide-react";
import { TestData } from "@/types/forcePlateTypes";

// Props for filter component (accepts parent filter state and handlers)
interface IndividualFiltersProps {
  data: TestData[];
  allData: TestData[];
  selectedTeams: string[];
  filters: {
    selectedAthletes: string[];
    testDates: string;
    testNames: string;
    metricTypes: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    selectedAthletes: string[];
    testDates: string;
    testNames: string;
    metricTypes: string;
  }>>;
  onTestSelect: (testName: string) => void;
  resetFiltersKey?: number;
}

// Main component for all 4 filters, sequential/cascading
export function IndividualFilters({
  data,
  allData,
  selectedTeams,
  filters,
  setFilters,
  onTestSelect,
  resetFiltersKey
}: IndividualFiltersProps) {

  // Filtering logic: Dropdown options
  // Athlete dropdown: only athletes in the filtered 'data' based on selected Team(s)
  const filteredAthleteNames = selectedTeams.length > 0
    ? Array.from(new Set(allData.filter(d => selectedTeams.includes(d.team_name)).map(d => d.athlete_name)))
    : Array.from(new Set(allData.map(d => d.athlete_name)));
  const uniqueTestNames = Array.from(
    new Set(data.map(d => d.test_name))
  ).filter(t => t !== "All Tests" && t !== "Isometric Test");
  const filtered = data.filter(d =>
    (filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(d.athlete_name)) &&
    (!filters.testDates || d.test_date === filters.testDates) &&
    (!filters.testNames || d.test_name === filters.testNames)
  );
  const uniqueTestDates = Array.from(new Set(filtered.map(d => d.test_date))).sort();
  const availableMetricTypes = filters.testNames
    ? getMetricTypesForTest(filters.testNames)
    : [];

  // Convert to option shape
  const athleteOptions = filteredAthleteNames.map(a => ({ value: a, label: a }));
  const dateOptions = uniqueTestDates.map(d => ({ value: d, label: formatDate(d) }));
  const testNameOptions = uniqueTestNames.map(t => ({ value: t, label: t }));
  const metricTypeOptions = availableMetricTypes.map(m => ({ value: m, label: m }));

  // --- Handlers: Cascade Reset (sequenced) ---
  // 1. Test Name
  const handleTestNameChange = (val: string) => {
    setFilters({
      testNames: val,
      selectedAthletes: [],
      testDates: "",
      metricTypes: ""
    });
    onTestSelect(val);
  };

  // 2. Athlete Name
  const handleAthleteChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedAthletes: next,
      testDates: "",
      metricTypes: ""
    }));
  };

  // 3. Test Date
  const handleDateChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      testDates: val,
      metricTypes: ""
    }));
  };

  // 4. Metric Type
  const handleMetricTypeChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      metricTypes: val,
    }));
  };

  // Reset handlers (with correct cascade)
  const handleResetTestName = () => {
    setFilters({
      testNames: "",
      selectedAthletes: [],
      testDates: "",
      metricTypes: ""
    });
    onTestSelect("");
  };
  const handleResetAthlete = () => setFilters(prev => ({
    ...prev,
    selectedAthletes: [],
    testDates: "",
    metricTypes: ""
  }));
  const handleResetDate = () => setFilters(prev => ({
    ...prev,
    testDates: "",
    metricTypes: ""
  }));
  const handleResetMetricType = () => setFilters(prev => ({
    ...prev,
    metricTypes: ""
  }));

  // Enable/disable (sequential)
  const athleteEnabled = !!filters.testNames;
  const testDateEnabled = filters.selectedAthletes.length > 0;
  const metricTypeEnabled = !!filters.testDates;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 justify-items-center items-end">
      {/* 1. Test Name (always enabled) */}
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

      {/* 2. Athlete Name (enabled after Test Name is selected) */}
      <div className={`w-[200px] min-w-[200px] max-w-[200px]`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
        <div className="flex items-center gap-2">
          <div className={athleteEnabled ? "" : "pointer-events-none"}>
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.selectedAthletes}
              onChange={athleteEnabled ? handleAthleteChange : () => {}}
              placeholder="All Athletes"
              className={`text-center ${!athleteEnabled ? "bg-black opacity-60 text-gray-300" : "bg-white"}`}
              labelClassName={athleteEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset Athlete Name"
            className={`p-2 ${!athleteEnabled ? "pointer-events-none opacity-50" : ""}`}
            onClick={athleteEnabled ? handleResetAthlete : undefined}
            type="button"
            disabled={!athleteEnabled}
          >
            <RefreshCcw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* 3. Test Date (enabled after Athlete Name) */}
      <div className={`w-[200px] min-w-[200px] max-w-[200px]`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date</label>
        <div className="flex items-center gap-2">
          <div className={testDateEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.testDates} onValueChange={testDateEnabled ? handleDateChange : () => {}}>
              <SelectTrigger className={`${testDateEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full`}>
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
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset Test Date"
            className={`p-2 ${!testDateEnabled ? "pointer-events-none opacity-50" : ""}`}
            onClick={testDateEnabled ? handleResetDate : undefined}
            type="button"
            disabled={!testDateEnabled}
          >
            <RefreshCcw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* 4. Metric Type (enabled after Test Date) */}
      <div className={`w-[200px] min-w-[200px] max-w-[200px]`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
        <div className="flex items-center gap-2">
          <div className={metricTypeEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.metricTypes} onValueChange={metricTypeEnabled ? handleMetricTypeChange : () => {}}>
              <SelectTrigger className={`${metricTypeEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full`}>
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
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset Metric Type"
            className={`p-2 ${!metricTypeEnabled ? "pointer-events-none opacity-50" : ""}`}
            onClick={metricTypeEnabled ? handleResetMetricType : undefined}
            type="button"
            disabled={!metricTypeEnabled}
          >
            <RefreshCcw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
