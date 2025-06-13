
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { TrendingUp, Users, Calendar, BarChart3 } from "lucide-react";
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
  // Safely get unique values with comprehensive null checks
  const safeData = Array.isArray(data) ? data.filter(item => {
    return item && 
           typeof item.test_name === 'string' && item.test_name.trim() !== '' &&
           typeof item.team_name === 'string' && item.team_name.trim() !== '' &&
           typeof item.athlete_name === 'string' && item.athlete_name.trim() !== '' &&
           typeof item.test_date === 'string' && item.test_date.trim() !== '';
  }) : [];
  
  const uniqueTests = safeData.length > 0 
    ? [...new Set(safeData.map(d => d.test_name?.toString().trim()).filter(test => 
        test && test !== "All Tests" && test !== "Isometric Test"
      ))]
    : [];
    
  const uniqueTeams = safeData.length > 0 
    ? [...new Set(safeData.map(d => d.team_name?.toString().trim()).filter(team => 
        team && team !== ''
      ))]
    : [];
    
  const uniqueAthletes = safeData.length > 0 
    ? [...new Set(safeData.map(d => d.athlete_name?.toString().trim()).filter(athlete => 
        athlete && athlete !== ''
      ))]
    : [];
    
  const uniqueTestDates = safeData.length > 0 
    ? [...new Set(safeData.map(d => d.test_date?.toString().trim()).filter(date => 
        date && date !== ''
      ))].sort()
    : [];

  // Filter data based on all selections with proper null checks
  const filteredData = safeData.filter(test => {
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

    const latestTest = uniqueTestDates.length > 0 ? uniqueTestDates[uniqueTestDates.length - 1] : "N/A";

    return { totalTests, avgPerformance, topPerformer, latestTest };
  };

  const highlights = getHighlights();

  return (
    <div className="space-y-6">
      {/* Test Selection Card - Professional styling like Looker Studio */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {selectedTest ? `Analysis: ${selectedTest}` : "Select Test for Analysis"}
            </h2>
            <p className="text-gray-600 text-sm">
              {selectedTest 
                ? `Comprehensive analysis for ${selectedTest} with applied filters`
                : "Choose a test type to begin detailed performance analysis"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters Section - Clean professional layout */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Performance Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Test Type</label>
              <Select value={selectedTest || ""} onValueChange={onTestChange}>
                <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Select Test Type" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {uniqueTests.map(test => (
                    <SelectItem key={test} value={test}>
                      {test}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Team</label>
              <MultiSelect
                options={uniqueTeams.map(team => ({ label: team, value: team }))}
                selected={selectedTeams}
                onChange={onTeamsChange}
                placeholder="Select Teams"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Athlete</label>
              <MultiSelect
                options={uniqueAthletes.map(athlete => ({ label: athlete, value: athlete }))}
                selected={selectedAthletes}
                onChange={onAthletesChange}
                placeholder="Select Athletes"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Test Date</label>
              <MultiSelect
                options={uniqueTestDates.map(date => ({ label: date, value: date }))}
                selected={selectedTestDates}
                onChange={onTestDatesChange}
                placeholder="Select Dates"
                className="bg-white border-gray-300"
              />
            </div>
          </div>

          {/* Key Metrics Cards - Professional styling */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.avgPerformance}</div>
              <div className="text-sm text-gray-600">Avg Peak Force (N)</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.topPerformer}</div>
              <div className="text-sm text-gray-600">Top Performer</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.latestTest}</div>
              <div className="text-sm text-gray-600">Latest Test</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
