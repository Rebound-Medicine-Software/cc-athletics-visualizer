
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { Trophy, TrendingUp, Users, Calendar } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

interface HighlightsSectionProps {
  data: TestData[];
  selectedTest: string;
  selectedTeams: string[];
  selectedAthletes: string[];
  selectedTestDates: string[];
  onTestChange: (test: string) => void;
  onTeamsChange: (teams: string[]) => void;
  onAthletesChange: (athletes: string[]) => void;
  onTestDatesChange: (dates: string[]) => void;
}

export const HighlightsSection = ({
  data = [],
  selectedTest,
  selectedTeams = [],
  selectedAthletes = [],
  selectedTestDates = [],
  onTestChange,
  onTeamsChange,
  onAthletesChange,
  onTestDatesChange
}: HighlightsSectionProps) => {
  // Safely get unique values with proper null checks
  const uniqueTests = data ? [...new Set(data.map(d => d?.test_name).filter(Boolean))].filter(test => test !== "All Tests" && test !== "Isometric Test") : [];
  const uniqueTeams = data ? [...new Set(data.map(d => d?.team_name).filter(Boolean))] : [];
  const uniqueAthletes = data ? [...new Set(data.map(d => d?.athlete_name).filter(Boolean))] : [];
  const uniqueTestDates = data ? [...new Set(data.map(d => d?.test_date).filter(Boolean))].sort() : [];

  // Filter data based on all selections with proper null checks
  const filteredData = (data || []).filter(test => {
    if (!test) return false;
    const testMatch = !selectedTest || test.test_name === selectedTest;
    const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(test.team_name);
    const athleteMatch = selectedAthletes.length === 0 || selectedAthletes.includes(test.athlete_name);
    const dateMatch = selectedTestDates.length === 0 || selectedTestDates.includes(test.test_date);
    return testMatch && teamMatch && athleteMatch && dateMatch;
  });

  // Calculate highlights based on filtered data
  const getHighlights = () => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalTests: 0,
        avgPerformance: "N/A",
        topPerformer: "N/A",
        latestTest: "N/A"
      };
    }

    const totalTests = filteredData.length;
    
    // Calculate average performance (using peak force as example)
    const peakForces = filteredData
      .map(test => {
        const metrics = test?.metrics as any;
        return metrics?.peak_force || metrics?.force_peak || 0;
      })
      .filter(force => force > 0);
    
    const avgPerformance = peakForces.length > 0 
      ? Math.round(peakForces.reduce((sum, force) => sum + force, 0) / peakForces.length)
      : "N/A";

    // Find top performer
    const athletePerformances = filteredData.reduce((acc, test) => {
      if (!test?.athlete_name) return acc;
      const metrics = test.metrics as any;
      const peakForce = metrics?.peak_force || metrics?.force_peak || 0;
      
      if (peakForce > 0) {
        if (!acc[test.athlete_name] || acc[test.athlete_name] < peakForce) {
          acc[test.athlete_name] = peakForce;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const topPerformer = Object.entries(athletePerformances)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    const latestTest = uniqueTestDates[uniqueTestDates.length - 1] || "N/A";

    return { totalTests, avgPerformance, topPerformer, latestTest };
  };

  const highlights = getHighlights();

  return (
    <div className="space-y-6">
      {/* Test Selection Notice */}
      <Card className="bg-gray-100 border-gray-300">
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {selectedTest ? `Analyzing: ${selectedTest}` : "Please Select A Test Name"}
          </h2>
          <p className="text-gray-600">
            {selectedTest 
              ? `Viewing detailed analysis for ${selectedTest} across all athletes`
              : "Choose a test from the filters below to view detailed analysis"
            }
          </p>
        </CardContent>
      </Card>

      {/* Individual Filters */}
      <Card className="bg-blue-50/80 border-blue-200">
        <CardHeader>
          <CardTitle className="text-center text-lg text-gray-800">Individual Filters</CardTitle>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
              <Select value={selectedTest || ""} onValueChange={onTestChange}>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Names</label>
              <MultiSelect
                options={uniqueTeams.map(team => ({ label: team, value: team }))}
                selected={selectedTeams}
                onChange={onTeamsChange}
                placeholder="Select Teams"
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Athlete Names</label>
              <MultiSelect
                options={uniqueAthletes.map(athlete => ({ label: athlete, value: athlete }))}
                selected={selectedAthletes}
                onChange={onAthletesChange}
                placeholder="Select Athletes"
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Dates</label>
              <MultiSelect
                options={uniqueTestDates.map(date => ({ label: date, value: date }))}
                selected={selectedTestDates}
                onChange={onTestDatesChange}
                placeholder="Select Dates"
                className="bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{highlights.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{highlights.avgPerformance}</div>
              <div className="text-sm text-gray-600">Avg Peak Force (N)</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{highlights.topPerformer}</div>
              <div className="text-sm text-gray-600">Top Performer</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{highlights.latestTest}</div>
              <div className="text-sm text-gray-600">Latest Test</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
