
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Trophy, TrendingUp, Users, Calendar } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useEffect, useState } from "react";

interface HighlightsSectionProps {
  data: any[];
  selectedTeam: string;
  onTeamChange: (team: string) => void;
  resetFiltersKey?: number;
}

export const HighlightsSection = ({
  data,
  selectedTeam,
  onTeamChange,
  resetFiltersKey
}: HighlightsSectionProps) => {
  // Multi-select states
  const allTeams = Array.from(new Set(data.map(d => d.team_name)));
  const [selectedTeams, setSelectedTeams] = useState<string[]>(selectedTeam && selectedTeam !== "all" ? [selectedTeam] : []);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  // Update multi state when team dropdown (used by parent for global selection) or reset is triggered
  useEffect(() => {
    setSelectedTeams(selectedTeam && selectedTeam !== "all" ? [selectedTeam] : []);
    setSelectedAthletes([]);
  }, [selectedTeam, resetFiltersKey]);

  // Athlete options, filtered by selected team(s)
  const filteredAthletes = selectedTeams.length > 0
    ? Array.from(new Set(data.filter(d => selectedTeams.includes(d.team_name)).map(d => d.athlete_name)))
    : Array.from(new Set(data.map(d => d.athlete_name)));

  // Dropdown options formatting
  const teamOptions = allTeams.map(t => ({ value: t, label: t }));
  const athleteOptions = filteredAthletes.map(a => ({ value: a, label: a }));

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
    const primaryTeam =
      Object.entries(teamCounts)
        .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))[0]?.[0] || "N/A";

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
    const topPerformer =
      Object.entries(athletePerformances)
        .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))[0]?.[0] || "N/A";

    const uniqueTestDates = [...new Set(filteredData.map(d => d.test_date))].sort();
    const latestTest = uniqueTestDates[uniqueTestDates.length - 1] || "N/A";

    return { totalTests, primaryTeam, topPerformer, latestTest };
  })();

  return (
    <Card className="bg-blue-50/80 border-blue-200 mb-6">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">Performance Highlights</CardTitle>
        <div className="flex gap-4 justify-center">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Team Name</label>
            <MultiSelectDropdown
              options={teamOptions}
              value={selectedTeams}
              onChange={(next) => {
                setSelectedTeams(next);
                // Also update global state to first-selected team or "all" if all cleared
                if (next.length === 1) {
                  onTeamChange(next[0]);
                } else if (next.length === 0) {
                  onTeamChange("all");
                }
              }}
              placeholder="All Teams"
              className="text-center"
              labelClassName="bg-white"
            />
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={selectedAthletes}
              onChange={setSelectedAthletes}
              placeholder="All Athletes"
              className="text-center"
              labelClassName="bg-white"
            />
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
  );
};

