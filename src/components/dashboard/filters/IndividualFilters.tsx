
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

  // Cascading filtering logic with mutual connections
  // 1. Apply team filter from Performance Insights first
  const teamFilteredData = selectedTeams.length > 0
    ? allData.filter(d => selectedTeams.includes(d.team_name))
    : allData;

  // 2. Test Names - only from team-filtered data
  const uniqueTestNames = Array.from(
    new Set(teamFilteredData.map(d => d.test_name))
  ).filter(t => t !== "All Tests" && t !== "Isometric Test");

  // 3. Athletes - filtered by team + test name (if selected)
  const testNameFilteredData = filters.testNames
    ? teamFilteredData.filter(d => d.test_name === filters.testNames)
    : teamFilteredData;
  const filteredAthleteNames = Array.from(new Set(testNameFilteredData.map(d => d.athlete_name)));

  // 4. Test Dates - filtered by team + test name + athletes (if selected)
  const athleteFilteredData = filters.selectedAthletes.length > 0
    ? testNameFilteredData.filter(d => filters.selectedAthletes.includes(d.athlete_name))
    : testNameFilteredData;
  const uniqueTestDates = Array.from(new Set(athleteFilteredData.map(d => d.test_date))).sort();

  // 5. Metric Types - based on selected test name only (these are predefined)
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
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 justify-items-center items-center min-h-[120px] content-center">
      {/* 1. Test Name (always enabled) */}
      <div className="w-[500px] min-w-[500px] max-w-[500px] flex flex-col items-center justify-center">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Name</label>
        <div className="flex items-center gap-2">
          <Select value={filters.testNames} onValueChange={handleTestNameChange}>
            <SelectTrigger className="flex items-center justify-between w-full border border-gray-300 rounded-md bg-white py-2 px-3 text-sm text-gray-700 text-center h-10 min-h-[40px] max-h-[40px]">
              <SelectValue placeholder="All Tests" className="whitespace-normal break-words text-center flex-1" />
            </SelectTrigger>
            <SelectContent className="w-[750px]">
              {testNameOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 rounded justify-start whitespace-normal break-words">
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
      <div className={`w-[500px] min-w-[500px] max-w-[500px] flex flex-col items-center justify-center`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Athlete Name</label>
        <div className="flex items-center gap-2">
          <div className={athleteEnabled ? "" : "pointer-events-none"}>
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.selectedAthletes}
              onChange={athleteEnabled ? handleAthleteChange : () => {}}
              placeholder="All Athletes"
              className={`text-center h-10 min-h-[40px] max-h-[40px] ${!athleteEnabled ? "bg-black opacity-60 text-gray-300" : "bg-white"}`}
              labelClassName={`${athleteEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none`}
              dropdownClassName="w-[750px]"
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
      <div className={`w-[500px] min-w-[500px] max-w-[500px] flex flex-col items-center justify-center`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Date</label>
        <div className="flex items-center gap-2">
          <div className={testDateEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.testDates} onValueChange={testDateEnabled ? handleDateChange : () => {}}>
              <SelectTrigger className={`flex items-center justify-between w-full border border-gray-300 rounded-md py-2 px-3 text-sm text-center h-10 min-h-[40px] max-h-[40px] ${testDateEnabled ? "bg-white text-gray-700" : "bg-black opacity-60 text-gray-300"}`}>
                <SelectValue placeholder="All Dates" className="whitespace-normal break-words text-center flex-1" />
              </SelectTrigger>
              <SelectContent className="w-[750px]">
                {dateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 rounded justify-start whitespace-normal break-words">
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
      <div className={`w-[500px] min-w-[500px] max-w-[500px] flex flex-col items-center justify-center`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Metric Type</label>
        <div className="flex items-center gap-2">
          <div className={metricTypeEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.metricTypes} onValueChange={metricTypeEnabled ? handleMetricTypeChange : () => {}}>
              <SelectTrigger className={`flex items-center justify-between w-full border border-gray-300 rounded-md py-2 px-3 text-sm text-center h-10 min-h-[40px] max-h-[40px] ${metricTypeEnabled ? "bg-white text-gray-700" : "bg-black opacity-60 text-gray-300"}`}>
                <SelectValue placeholder="All Metrics" className="whitespace-normal break-words text-center flex-1" />
              </SelectTrigger>
              <SelectContent className="w-[750px]">
                {metricTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 rounded justify-start whitespace-normal break-words">
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
