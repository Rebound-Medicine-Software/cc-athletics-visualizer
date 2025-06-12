
import { HighlightsSection } from "./HighlightsSection";
import { ExerciseVideoSection } from "./ExerciseVideoSection";
import { ComparisonChart } from "./ComparisonChart";
import { RegionComparison } from "./RegionComparison";
import { MetricCards } from "./MetricCards";
import { TestData } from "@/types/forcePlateTypes";

interface DashboardLayoutProps {
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

export const DashboardLayout = ({
  data,
  selectedTest,
  selectedTeams,
  selectedAthletes,
  selectedTestDates,
  onTestChange,
  onTeamsChange,
  onAthletesChange,
  onTestDatesChange
}: DashboardLayoutProps) => {
  // Filter data based on all selections
  const filteredData = data.filter(test => {
    const testMatch = !selectedTest || test.test_name === selectedTest;
    const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(test.team_name);
    const athleteMatch = selectedAthletes.length === 0 || selectedAthletes.includes(test.athlete_name);
    const dateMatch = selectedTestDates.length === 0 || selectedTestDates.includes(test.test_date);
    return testMatch && teamMatch && athleteMatch && dateMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Section - Test Selection and Highlights */}
      <HighlightsSection
        data={data}
        selectedTest={selectedTest}
        selectedTeams={selectedTeams}
        selectedAthletes={selectedAthletes}
        selectedTestDates={selectedTestDates}
        onTestChange={onTestChange}
        onTeamsChange={onTeamsChange}
        onAthletesChange={onAthletesChange}
        onTestDatesChange={onTestDatesChange}
      />

      {/* Middle Section - Video and Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Exercise Video */}
        <div className="lg:col-span-1">
          <ExerciseVideoSection selectedTest={selectedTest} />
        </div>
        
        {/* Right - Comparison Chart */}
        <div className="lg:col-span-2">
          <ComparisonChart data={filteredData} />
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards selectedTest={selectedTest} data={filteredData} />

      {/* Region Comparisons */}
      <RegionComparison data={filteredData} />
    </div>
  );
};
