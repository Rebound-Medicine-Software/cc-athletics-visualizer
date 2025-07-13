
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
    selectedSex: string[];
    selectedAthletes: string[];
    testDates: string;
    testNames: string;
    metricTypes: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    selectedSex: string[];
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

  // 2. Sex/Gender - from team-filtered data
  const uniqueSexOptions = Array.from(
    new Set(teamFilteredData.map(d => d.gender).filter(Boolean))
  );

  // 3. Test Names - filtered by team + sex (if selected)
  const sexFilteredData = filters.selectedSex.length > 0
    ? teamFilteredData.filter(d => {
        const gender = d.gender;
        return gender && filters.selectedSex.includes(gender);
      })
    : teamFilteredData;
  const uniqueTestNames = Array.from(
    new Set(sexFilteredData.map(d => d.test_name))
  ).filter(t => t !== "All Tests" && t !== "Isometric Test");

  // 4. Athletes - filtered by team + sex + test name (if selected)
  const testNameFilteredData = filters.testNames
    ? sexFilteredData.filter(d => d.test_name === filters.testNames)
    : sexFilteredData;
  const filteredAthleteNames = Array.from(new Set(testNameFilteredData.map(d => d.athlete_name)));

  // 5. Test Dates - filtered by team + sex + test name + athletes (if selected)
  const athleteFilteredData = filters.selectedAthletes.length > 0
    ? testNameFilteredData.filter(d => filters.selectedAthletes.includes(d.athlete_name))
    : testNameFilteredData;
  const uniqueTestDates = Array.from(new Set(athleteFilteredData.map(d => d.test_date))).sort();

  // 6. Metric Types - based on selected test name only (these are predefined)
  const availableMetricTypes = filters.testNames
    ? getMetricTypesForTest(filters.testNames)
    : [];

  // Convert to option shape
  const sexOptions = uniqueSexOptions.map(s => ({ value: s, label: s }));
  const athleteOptions = filteredAthleteNames.map(a => ({ value: a, label: a }));
  const dateOptions = uniqueTestDates.map(d => ({ value: d, label: formatDate(d) }));
  const testNameOptions = uniqueTestNames.map(t => ({ value: t, label: t }));
  const metricTypeOptions = availableMetricTypes.map(m => ({ value: m, label: m }));

  // --- Handlers: Cascade Reset (sequenced) ---
  // 1. Sex
  const handleSexChange = (next: string[]) => {
    setFilters({
      selectedSex: next,
      testNames: "",
      selectedAthletes: [],
      testDates: "",
      metricTypes: ""
    });
    onTestSelect("");
  };

  // 2. Test Name
  const handleTestNameChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      testNames: val,
      selectedAthletes: [],
      testDates: "",
      metricTypes: ""
    }));
    onTestSelect(val);
  };

  // 3. Athlete Name
  const handleAthleteChange = (next: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedAthletes: next,
      testDates: "",
      metricTypes: ""
    }));
  };

  // 4. Test Date
  const handleDateChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      testDates: val,
      metricTypes: ""
    }));
  };

  // 5. Metric Type
  const handleMetricTypeChange = (val: string) => {
    setFilters(prev => ({
      ...prev,
      metricTypes: val,
    }));
  };

  // Reset handlers (with correct cascade)
  const handleResetSex = () => {
    setFilters({
      selectedSex: [],
      testNames: "",
      selectedAthletes: [],
      testDates: "",
      metricTypes: ""
    });
    onTestSelect("");
  };
  const handleResetTestName = () => {
    setFilters(prev => ({
      ...prev,
      testNames: "",
      selectedAthletes: [],
      testDates: "",
      metricTypes: ""
    }));
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
  const testNameEnabled = filters.selectedSex.length > 0;
  const athleteEnabled = !!filters.testNames;
  const testDateEnabled = filters.selectedAthletes.length > 0;
  const metricTypeEnabled = !!filters.testDates;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6 justify-items-center items-center min-h-[120px] content-center">
      {/* 1. Sex (always enabled) */}
      <div className="w-[400px] min-w-[400px] max-w-[400px] flex flex-col items-center justify-center">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Sex</label>
        <div className="flex items-center gap-2">
          <MultiSelectDropdown
            options={sexOptions}
            value={filters.selectedSex}
            onChange={handleSexChange}
            placeholder="All Sexes"
            className="text-center h-10 min-h-[40px] max-h-[40px] bg-white"
            labelClassName="bg-white h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none"
            dropdownClassName="w-[600px]"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset Sex"
            className="p-2"
            onClick={handleResetSex}
            type="button"
          >
            <RefreshCcw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* 2. Test Name (enabled after Sex is selected) */}
      <div className="w-[400px] min-w-[400px] max-w-[400px] flex flex-col items-center justify-center">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Name</label>
        <div className="flex items-center gap-2">
          <div className={testNameEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.testNames} onValueChange={testNameEnabled ? handleTestNameChange : () => {}}>
              <SelectTrigger className={`${testNameEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden`}>
                <SelectValue placeholder="All Tests" />
              </SelectTrigger>
              <SelectContent className="w-[600px]">
                {testNameOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="whitespace-normal break-words">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset Test Name"
            className={`p-2 ${!testNameEnabled ? "pointer-events-none opacity-50" : ""}`}
            onClick={testNameEnabled ? handleResetTestName : undefined}
            type="button"
            disabled={!testNameEnabled}
          >
            <RefreshCcw className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* 3. Athlete Name (enabled after Test Name is selected) */}
      <div className={`w-[400px] min-w-[400px] max-w-[400px] flex flex-col items-center justify-center`}>
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
              dropdownClassName="w-[600px]"
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

      {/* 4. Test Date (enabled after Athlete Name) */}
      <div className={`w-[400px] min-w-[400px] max-w-[400px] flex flex-col items-center justify-center`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Date</label>
        <div className="flex items-center gap-2">
          <div className={testDateEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.testDates} onValueChange={testDateEnabled ? handleDateChange : () => {}}>
              <SelectTrigger className={`${testDateEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden`}>
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent className="w-[600px]">
                {dateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="whitespace-normal break-words">
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

      {/* 5. Metric Type (enabled after Test Date) */}
      <div className={`w-[400px] min-w-[400px] max-w-[400px] flex flex-col items-center justify-center`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Metric Type</label>
        <div className="flex items-center gap-2">
          <div className={metricTypeEnabled ? "" : "pointer-events-none"}>
            <Select value={filters.metricTypes} onValueChange={metricTypeEnabled ? handleMetricTypeChange : () => {}}>
              <SelectTrigger className={`${metricTypeEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden`}>
                <SelectValue placeholder="All Metrics" />
              </SelectTrigger>
              <SelectContent className="w-[600px]">
                {metricTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="whitespace-normal break-words">
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
