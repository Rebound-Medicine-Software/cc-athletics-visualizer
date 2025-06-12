
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { ComparisonChart } from "./ComparisonChart";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  selectedTeams: string[];
  onTeamsChange: (teams: string[]) => void;
  allData: TestData[];
}

export const ReportFilters = ({
  data,
  onTestSelect,
  selectedTeams,
  onTeamsChange,
  allData
}: ReportFiltersProps) => {
  const [filters, setFilters] = useState({
    selectedAthletes: [] as string[],
    testDates: [] as string[],
    testName: "",
    metricType: ""
  });

  // Get unique values for dropdowns
  const uniqueTeams = [...new Set(allData.map(d => d.team_name))];
  const uniqueAthletes = [...new Set(data.map(d => d.athlete_name))];
  const uniqueTestDates = [...new Set(data.map(d => d.test_date))].sort();

  // Filter test names - remove "All Tests" and "Isometric Test"
  const uniqueTests = [...new Set(data.map(d => d.test_name))].filter(test => test !== "All Tests" && test !== "Isometric Test");

  // Get metric types based on selected test
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
        return ["Maximum Rate of Force Development", "Force at Max Rate of Force Development", "Peak Force", "Early Explosive Power"];
    }
  };
  
  const availableMetricTypes = filters.testName ? getMetricTypesForTest(filters.testName) : [];

  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value,
      metricType: ""
    }));
    onTestSelect(value);
  };

  const handleTeamChange = (value: string) => {
    if (value === "") {
      onTeamsChange([]);
    } else {
      onTeamsChange([value]);
    }
  };

  const handleAthleteChange = (value: string) => {
    if (value === "") {
      setFilters(prev => ({ ...prev, selectedAthletes: [] }));
    } else {
      setFilters(prev => ({ ...prev, selectedAthletes: [value] }));
    }
  };

  const handleDateChange = (value: string) => {
    if (value === "") {
      setFilters(prev => ({ ...prev, testDates: [] }));
    } else {
      setFilters(prev => ({ ...prev, testDates: [value] }));
    }
  };

  // Filter data for comparison chart based on current selections
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
      <CardContent className="p-4">
        <div className="flex gap-4 mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white px-[240px]">
            Individual Filters
          </Button>
        </div>
        
        {/* Team Name Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
          <Select value={selectedTeams[0] || ""} onValueChange={handleTeamChange}>
            <SelectTrigger className="bg-white max-w-xs">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Teams</SelectItem>
              {uniqueTeams.map(team => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Athlete Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Athlete Name</label>
            <Select value={filters.selectedAthletes[0] || ""} onValueChange={handleAthleteChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Athletes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Athletes</SelectItem>
                {uniqueAthletes.map(athlete => (
                  <SelectItem key={athlete} value={athlete}>
                    {athlete}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Date(s)</label>
            <Select value={filters.testDates[0] || ""} onValueChange={handleDateChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Dates</SelectItem>
                {uniqueTestDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric Type</label>
            <Select 
              value={filters.metricType} 
              onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))} 
              disabled={!filters.testName}
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

        {/* Comparison Chart moved here */}
        <ComparisonChart data={getFilteredDataForChart()} />
      </CardContent>
    </Card>
  );
};
