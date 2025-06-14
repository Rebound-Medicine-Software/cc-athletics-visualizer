import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { Trophy, TrendingUp, Users, Calendar } from "lucide-react";

interface HighlightsSectionProps {
  data: TestData[];
  selectedTeam: string;
  selectedAthlete: string;
  onTeamChange: (team: string) => void;
  onAthleteChange: (athlete: string) => void;
}

export const HighlightsSection = ({
  data,
  selectedTeam,
  selectedAthlete,
  onTeamChange,
  onAthleteChange
}: HighlightsSectionProps) => {
  const uniqueTeams = [...new Set(data.map(d => d.team_name))];

  // Filter athletes by selected team
  const filteredAthletes = selectedTeam && selectedTeam !== "all"
    ? [...new Set(data.filter(d => d.team_name === selectedTeam).map(d => d.athlete_name))]
    : [...new Set(data.map(d => d.athlete_name))];

  // Filter data based on selections
  const filteredData = data.filter(test => {
    const teamMatch = !selectedTeam || selectedTeam === "all" || test.team_name === selectedTeam;
    const athleteMatch = !selectedAthlete || selectedAthlete === "all" || test.athlete_name === selectedAthlete;
    return teamMatch && athleteMatch;
  });

  // Calculate highlights based on filtered data
  const getHighlights = () => {
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
    
    const primaryTeam = Object.entries(teamCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    // Find top performer based on peak force
    const athletePerformances = filteredData.reduce((acc, test) => {
      const metrics = test.metrics as any;
      const peakForce = metrics?.peak_force || metrics?.force_peak || 0;
      
      if (peakForce && typeof peakForce === 'number' && !isNaN(peakForce) && peakForce > 0) {
        if (!acc[test.athlete_name] || acc[test.athlete_name] < peakForce) {
          acc[test.athlete_name] = peakForce;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const topPerformer = Object.entries(athletePerformances)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    const uniqueTestDates = [...new Set(filteredData.map(d => d.test_date))].sort();
    const latestTest = uniqueTestDates[uniqueTestDates.length - 1] || "N/A";

    return { totalTests, primaryTeam, topPerformer, latestTest };
  };

  const highlights = getHighlights();

  return (
    <Card className="bg-blue-50/80 border-blue-200 mb-6">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">Performance Highlights</CardTitle>
        <div className="flex gap-4 justify-center">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
            <Select value={selectedTeam || "all"} onValueChange={onTeamChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {uniqueTeams.map(team => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2">Athlete Name</label>
            <Select value={selectedAthlete || "all"} onValueChange={onAthleteChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Athletes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Athletes</SelectItem>
                {filteredAthletes.map(athlete => (
                  <SelectItem key={athlete} value={athlete}>
                    {athlete}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="text-xl font-bold text-gray-800">{highlights.latestTest}</div>
            <div className="text-sm text-gray-600">Latest Test</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
