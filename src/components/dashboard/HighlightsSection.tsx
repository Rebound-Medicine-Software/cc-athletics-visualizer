
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Users, Calendar, RefreshCcw } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MetricCards } from "./MetricCards";
import { getMetricTypesForTest } from "./filters/filterUtils";

interface HighlightsSectionProps {
  data: any[];
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
  resetFiltersKey?: number;
  allData: any[];
  branding?: any;
}

export const HighlightsSection = ({
  data,
  selectedTeams,
  setSelectedTeams,
  resetFiltersKey,
  allData,
  branding
}: HighlightsSectionProps) => {
  // All Teams
  const allTeams = Array.from(new Set(data.map(d => d.team_name)));
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  // Second Individual Filters state
  const [secondFilters, setSecondFilters] = useState({
    selectedAthlete: "",
    testNames: ""
  });
  useEffect(() => {
    setSelectedAthletes([]);
    setSecondFilters({
      selectedAthlete: "",
      testNames: ""
    });
  }, [selectedTeams, resetFiltersKey]);

  // Filter athletes by selected teams
  const filteredAthletes = selectedTeams.length > 0 ? Array.from(new Set(data.filter(d => selectedTeams.includes(d.team_name)).map(d => d.athlete_name))) : Array.from(new Set(data.map(d => d.athlete_name)));
  const teamOptions = allTeams.map(t => ({
    value: t,
    label: t
  }));
  const athleteOptions = filteredAthletes.map(a => ({
    value: a,
    label: a
  }));

  // Reset handlers for team/athlete
  const handleResetTeams = () => setSelectedTeams([]);
  const handleResetAthletes = () => setSelectedAthletes([]);

  // Filtering logic
  const filteredData = data.filter(test => {
    const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(test.team_name);
    const athleteMatch = selectedAthletes.length === 0 || selectedAthletes.includes(test.athlete_name);
    return teamMatch && athleteMatch;
  });

  // Calculate highlights based on filtered data
  const highlights = (() => {
    if (filteredData.length === 0) {
      return {
        totalTests: 0,
        primaryTeam: "N/A",
        topPerformer: "N/A",
        latestTest: "N/A"
      };
    }
    const totalTests = filteredData.length;

    // Find the most common team name
    const teamCounts = filteredData.reduce((acc, test) => {
      acc[test.team_name] = (acc[test.team_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const primaryTeam = Object.entries(teamCounts).sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))[0]?.[0] || "N/A";

    // Find top performer based on peak force
    const athletePerformances = filteredData.reduce((acc, test) => {
      const metrics = test.metrics as any;
      let peakForce: number = 0;
      if (typeof metrics?.peak_force === 'number') {
        peakForce = metrics.peak_force;
      } else if (typeof metrics?.force_peak === 'number') {
        peakForce = metrics.force_peak;
      } else if (typeof metrics?.peakForce === 'number') {
        peakForce = metrics.peakForce;
      }
      peakForce = Number.isFinite(peakForce) ? peakForce : 0;
      if (peakForce > 0) {
        if (!acc[test.athlete_name] || acc[test.athlete_name] < peakForce) {
          acc[test.athlete_name] = peakForce;
        }
      }
      return acc;
    }, {} as Record<string, number>);
    const topPerformer = Object.entries(athletePerformances).sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))[0]?.[0] || "N/A";
    const uniqueTestDates = [...new Set(filteredData.map(d => d.test_date))].sort();
    const latestTest = uniqueTestDates[uniqueTestDates.length - 1] || "N/A";
    return {
      totalTests,
      primaryTeam,
      topPerformer,
      latestTest
    };
  })();

  // Chart Data - filtered by this component's own filter state
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(test.team_name);
      const testMatch = !secondFilters.testNames || test.test_name === secondFilters.testNames;
      const athleteMatch = !secondFilters.selectedAthlete || test.athlete_name === secondFilters.selectedAthlete;
      return teamMatch && testMatch && athleteMatch;
    });
  };

  // Dummy handlers for second Individual Filters (no functionality yet)
  const handleSecondTestSelect = (testName: string) => {
    console.log("Second Individual Filters test selected:", testName);
  };
  
  return <div style={branding ? { fontFamily: branding.font_family || 'Inter, system-ui, sans-serif' } : {}}>
      <Card 
        className="mb-6 mt-4 border-2"
        style={{
          backgroundColor: branding?.primary_color ? `${branding.primary_color}15` : 'hsl(var(--primary) / 0.08)',
          borderColor: branding?.primary_color ? `${branding.primary_color}50` : 'hsl(var(--primary) / 0.3)'
        }}
      >
        <CardHeader className="sticky top-[80px] z-30 rounded-t-lg" style={{
          backgroundColor: branding?.primary_color ? `${branding.primary_color}15` : 'hsl(var(--primary) / 0.08)',
        }}>
          <CardTitle className="text-center text-lg text-gray-800">Performance Insights</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team Name */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Team Name</label>
              <MultiSelectDropdown options={teamOptions} value={selectedTeams} onChange={setSelectedTeams} placeholder="All Teams" className="text-center" labelClassName="bg-white" />
            </div>

            {/* Athlete Name */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
              <MultiSelectDropdown options={athleteOptions} value={selectedAthletes} onChange={setSelectedAthletes} placeholder="All Athletes" className="text-center" labelClassName="bg-white" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{highlights.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-gray-800 truncate">{highlights.primaryTeam}</div>
              <div className="text-sm text-gray-600">Primary Team</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-gray-800 truncate">{highlights.topPerformer}</div>
              <div className="text-sm text-gray-600">Top Performer</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-xl font-bold text-gray-800">
                {highlights.latestTest !== "N/A" ? formatDate(highlights.latestTest) : "N/A"}
              </div>
              <div className="text-sm text-gray-600">Latest Test</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Individual Filters Section */}
      <Card 
        className="mb-6 border-2"
        style={{
          backgroundColor: branding?.secondary_color ? `${branding.secondary_color}10` : 'hsl(var(--card))',
          borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
        }}
      >
        <CardContent className="p-4">
          {/* Section Title */}
          <h2 className="text-lg font-semibold text-center mb-4 text-foreground">Athlete Highlights</h2>
          {/* Header */}
          <div className="flex justify-center mb-4">
            <Button 
              variant="default" 
              className="w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center text-white"
              style={{
                backgroundColor: branding?.accent_color || 'hsl(var(--accent))',
                borderColor: branding?.accent_color || 'hsl(var(--accent))'
              }}
            >
              {secondFilters.selectedAthlete && secondFilters.testNames 
                ? `${secondFilters.selectedAthlete} - ${secondFilters.testNames}` 
                : "Please Select a 'Test Name' and 'Athlete Name'"}
            </Button>
          </div>

          {/* Individual Filters - simplified to only Test Name and Athlete Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Test Name */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
              <Select 
                value={secondFilters.testNames} 
                 onValueChange={(value) => {
                   setSecondFilters(prev => ({
                     ...prev,
                     testNames: value,
                     selectedAthlete: ""
                   }));
                   handleSecondTestSelect(value);
                 }}
              >
                <SelectTrigger className="bg-white text-center">
                  <SelectValue placeholder="Select Test" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {Array.from(new Set(allData.filter(d => 
                    selectedTeams.length === 0 || selectedTeams.includes(d.team_name)
                  ).map(d => d.test_name))).filter(t => t !== "All Tests" && t !== "Isometric Test").map(testName => (
                    <SelectItem key={testName} value={testName}>
                      {testName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Athlete Name - Single Select */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
              {!secondFilters.testNames ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center justify-center">
                  Select Athlete
                </div>
              ) : (
                <Select 
                  value={secondFilters.selectedAthlete} 
                  onValueChange={(value) => {
                    setSecondFilters(prev => ({
                      ...prev,
                      selectedAthlete: value
                    }));
                  }}
                >
                  <SelectTrigger className="bg-white text-center">
                    <SelectValue placeholder="Select Athlete" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {Array.from(new Set(
                      allData.filter(d => 
                        (selectedTeams.length === 0 || selectedTeams.includes(d.team_name)) &&
                        (!secondFilters.testNames || d.test_name === secondFilters.testNames)
                      ).map(d => d.athlete_name)
                    )).map(athleteName => (
                      <SelectItem key={athleteName} value={athleteName}>
                        {athleteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Metric Cards - positioned right after the filters */}
          {secondFilters.testNames && secondFilters.selectedAthlete && (
            <div className="mt-6">
              <MetricCards
                selectedTest={secondFilters.testNames}
                data={getFilteredDataForChart()}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
};
