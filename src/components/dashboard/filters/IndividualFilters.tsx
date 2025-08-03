
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
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Test Name</label>
        <Select value={filters.testNames} onValueChange={handleTestNameChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select Test Name" />
          </SelectTrigger>
          <SelectContent>
            {testNameOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Athlete Name (enabled after Test Name is selected) - Multi-Select */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Athlete Name</label>
        <div className={athleteEnabled ? "" : "pointer-events-none opacity-50"}>
          {!athleteEnabled ? (
            <div className="h-10 px-3 py-2 bg-muted text-muted-foreground rounded-md border border-input flex items-center text-sm">
              Select Athletes
            </div>
          ) : (
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.selectedAthletes}
              onChange={handleAthleteChange}
              placeholder="Select Athletes"
              className="w-full"
            />
          )}
        </div>
      </div>

      {/* 4. Test Date (enabled after Athlete Name) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Test Date</label>
        <div className={testDateEnabled ? "" : "pointer-events-none opacity-50"}>
          {!testDateEnabled ? (
            <div className="h-10 px-3 py-2 bg-muted text-muted-foreground rounded-md border border-input flex items-center text-sm">
              Select Date
            </div>
          ) : (
            <Select value={filters.testDates} onValueChange={handleDateChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select Date" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* 5. Metric Type (enabled after Test Date) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Metric Type</label>
        <div className={metricTypeEnabled ? "" : "pointer-events-none opacity-50"}>
          {!metricTypeEnabled ? (
            <div className="h-10 px-3 py-2 bg-muted text-muted-foreground rounded-md border border-input flex items-center text-sm">
              Select Metric
            </div>
          ) : (
            <Select value={filters.metricTypes} onValueChange={handleMetricTypeChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                {metricTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
