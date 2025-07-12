import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Trophy, TrendingUp, Users, Calendar, RefreshCcw } from "lucide-react";
import { formatDate } from "@/utils/dateUtils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
interface HighlightsSectionProps {
  data: any[];
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
  resetFiltersKey?: number;
}
export const HighlightsSection = ({
  data,
  selectedTeams,
  setSelectedTeams,
  resetFiltersKey
}: HighlightsSectionProps) => {
  // All Teams
  const allTeams = Array.from(new Set(data.map(d => d.team_name)));
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  useEffect(() => {
    setSelectedAthletes([]);
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
  return <Card className="bg-blue-50/80 border-blue-200 mb-6">
      <CardHeader>
        <CardTitle className="text-center text-lg text-gray-800">Performance Insights</CardTitle>
        <div className="flex gap-4 justify-center">
          <div className="w-[500px] min-w-[500px] max-w-[500px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Team Name</label>
            <div className="flex items-center gap-2">
              <MultiSelectDropdown 
                options={teamOptions} 
                value={selectedTeams} 
                onChange={setSelectedTeams} 
                placeholder="All Teams" 
                className="text-center h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none" 
                labelClassName="bg-white h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none"
                dropdownClassName="w-[750px]"
              />
              <Button variant="ghost" size="icon" aria-label="Reset Team Name" className="p-2" onClick={handleResetTeams} type="button">
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
          <div className="w-[500px] min-w-[500px] max-w-[500px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Athlete Name</label>
            <div className="flex items-center gap-2">
              <MultiSelectDropdown 
                options={athleteOptions} 
                value={selectedAthletes} 
                onChange={setSelectedAthletes} 
                placeholder="All Athletes" 
                className="text-center h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none" 
                labelClassName="bg-white h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none"
                dropdownClassName="w-[750px]"
              />
              <Button variant="ghost" size="icon" aria-label="Reset Athlete Name" className="p-2" onClick={handleResetAthletes} type="button">
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
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
    </Card>;
};