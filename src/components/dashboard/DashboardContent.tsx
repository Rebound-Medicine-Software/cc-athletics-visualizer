import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportFilters } from "@/components/dashboard/ReportFilters";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { HighlightsSection } from "@/components/dashboard/HighlightsSection";
import { RegionComparison } from "@/components/dashboard/RegionComparison";
import { CheckCircle, AlertCircle } from "lucide-react";
import { TestData } from "@/types/forcePlateTypes";

interface DashboardContentProps {
  data: TestData[];
  isLoading: boolean;
  error: any;
  errorMessage: string;
  hasNoData: boolean;
  selectedTest: string;
  setSelectedTest: (test: string) => void;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  selectedAthlete: string;
  setSelectedAthlete: (athlete: string) => void;
  handleRefresh: () => void;
  orgData: { name: string; logo: string | null };
  navigationItems: any[];
  activeSection: string;
  resetFiltersKey?: number; // Added to receive key for filter reset
}

export const DashboardContent = ({
  data,
  isLoading,
  error,
  errorMessage,
  hasNoData,
  selectedTest,
  setSelectedTest,
  selectedTeam,
  setSelectedTeam,
  selectedAthlete,
  setSelectedAthlete,
  handleRefresh,
  orgData,
  navigationItems,
  activeSection,
  resetFiltersKey, // added to props
}: DashboardContentProps) => {
  // Filter data based on selected team and athlete (master filters)
  const filteredData =
    data?.filter((test) => {
      const teamMatch =
        !selectedTeam ||
        selectedTeam === "all" ||
        test.team_name === selectedTeam;
      const athleteMatch =
        !selectedAthlete ||
        selectedAthlete === "all" ||
        test.athlete_name === selectedAthlete;
      return teamMatch && athleteMatch;
    }) || [];

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to {orgData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your comprehensive force plate analysis platform dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      case "dashboard":
        return (
          <div className="space-y-6">
            <Card className="bg-gray-100 border-gray-300">
              <CardContent className="p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  {selectedTest
                    ? `Analyzing: ${selectedTest}`
                    : "Please Select A 'Test Name'"}
                </h2>
                <p className="text-gray-600">
                  {selectedTest
                    ? `Viewing detailed analysis for ${selectedTest} across all athletes`
                    : "Choose a test from the filters below to view detailed analysis"}
                </p>
              </CardContent>
            </Card>

            <HighlightsSection
              data={data || []}
              selectedTeam={selectedTeam}
              selectedAthlete={selectedAthlete}
              onTeamChange={(team) => setSelectedTeam(team === "all" ? "" : team)}
              onAthleteChange={(athlete) =>
                setSelectedAthlete(athlete === "all" ? "" : athlete)
              }
            />

            <ReportFilters
              data={filteredData}
              onTestSelect={setSelectedTest}
              allData={data || []}
              metricCardsSlot={
                <MetricCards selectedTest={selectedTest} data={filteredData} />
              }
              resetFiltersKey={resetFiltersKey} // Pass the resetFiltersKey so ReportFilters can reset
            />

            <RegionComparison data={filteredData} />
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {
                    navigationItems.find(
                      (item: any) => item.id === activeSection
                    )?.label
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  This section is coming soon! We're working hard to bring you the best experience.
                </p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading data: {errorMessage}
            <span>
              <button
                className="ml-2 underline text-blue-600"
                onClick={handleRefresh}
              >
                Retry
              </button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {data && data.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Dashboard loaded successfully with {data.length} test records from CC Athletics API
            <Badge className="ml-2 bg-green-100 text-green-800">Live Data</Badge>
          </AlertDescription>
        </Alert>
      )}

      {hasNoData && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="font-semibold mb-2">
              No test data found in your database
            </div>
            <p className="text-sm">
              Your API key is valid, but no test data was found. Please contact support if you believe this is an error.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-6">
        {/* Sidebar is rendered in Dashboard.tsx */}
        <div className="flex-1">{renderContent()}</div>
      </div>
    </div>
  );
};
