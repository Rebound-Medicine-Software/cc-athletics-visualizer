import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
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
        // Isometric tests
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
  const handleTeamToggle = (teamName: string) => {
    const newTeams = selectedTeams.includes(teamName) ? selectedTeams.filter(t => t !== teamName) : [...selectedTeams, teamName];
    onTeamsChange(newTeams);
  };
  const handleAthleteToggle = (athleteName: string) => {
    const newAthletes = filters.selectedAthletes.includes(athleteName) ? filters.selectedAthletes.filter(a => a !== athleteName) : [...filters.selectedAthletes, athleteName];
    setFilters(prev => ({
      ...prev,
      selectedAthletes: newAthletes
    }));
  };
  const handleDateToggle = (date: string) => {
    const newDates = filters.testDates.includes(date) ? filters.testDates.filter(d => d !== date) : [...filters.testDates, date];
    setFilters(prev => ({
      ...prev,
      testDates: newDates
    }));
  };
  return <Card className="bg-teal-50/80 border-teal-200">
      <CardContent className="p-4">
        <div className="flex gap-4 mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white px-[240px]">
            Individual Filters
          </Button>
        </div>
        
        {/* Team Name Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
          <div className="flex flex-wrap gap-2">
            {uniqueTeams.map(team => <Button key={team} variant={selectedTeams.includes(team) ? "default" : "outline"} size="sm" onClick={() => handleTeamToggle(team)} className={selectedTeams.includes(team) ? "bg-teal-600 text-white" : ""}>
                {team}
              </Button>)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Athlete Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Athlete Name</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2 bg-white">
              {uniqueAthletes.map(athlete => <div key={athlete} className="flex items-center space-x-2 mb-1">
                  <input type="checkbox" id={`athlete-${athlete}`} checked={filters.selectedAthletes.includes(athlete)} onChange={() => handleAthleteToggle(athlete)} className="rounded border-gray-300" />
                  <label htmlFor={`athlete-${athlete}`} className="text-sm">
                    {athlete}
                  </label>
                </div>)}
            </div>
          </div>

          {/* Test Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Date(s)</label>
            <div className="max-h-32 overflow-y-auto border rounded p-2 bg-white">
              {uniqueTestDates.map(date => <div key={date} className="flex items-center space-x-2 mb-1">
                  <input type="checkbox" id={`date-${date}`} checked={filters.testDates.includes(date)} onChange={() => handleDateToggle(date)} className="rounded border-gray-300" />
                  <label htmlFor={`date-${date}`} className="text-sm">
                    {date}
                  </label>
                </div>)}
            </div>
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
            <Select value={filters.testName} onValueChange={handleTestNameChange}>
              <SelectTrigger className="bg-black text-white border-gray-600">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent>
                {uniqueTests.map(test => <SelectItem key={test} value={test}>
                    {test}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric Type</label>
            <Select value={filters.metricType} onValueChange={value => setFilters(prev => ({
            ...prev,
            metricType: value
          }))} disabled={!filters.testName}>
              <SelectTrigger className="bg-black text-white border-gray-600">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                {availableMetricTypes.map(metric => <SelectItem key={metric} value={metric}>
                    {metric}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>;
};