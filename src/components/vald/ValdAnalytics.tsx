import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Loader2, RefreshCcw, Activity } from "lucide-react";
import { HighlightsSection } from "@/components/dashboard/HighlightsSection";
import { ReportFilters } from "@/components/dashboard/ReportFilters";
import { IndividualComparisonSection } from "@/components/dashboard/IndividualComparisonSection";
import { EliteComparison } from "@/components/dashboard/EliteComparison";
import { SendReportsModal } from "@/components/dashboard/SendReportsModal";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useValdAthletes, useValdMultiAthleteTests } from "@/hooks/useVald";
import { valdTestsToTestData, valdTestsToReportData } from "@/lib/valdToCCAthletics";
import { TestData } from "@/types/forcePlateTypes";

const MAX_ATHLETES = 8;

interface ValdAnalyticsProps {
  branding?: any;
}

/**
 * VALD Hub analytics — a mirror of /dashboard > Analytics driven entirely by
 * VALD ForceDecks data: Performance Insights & Athlete Highlights, Comparisons
 * Amongst Peers, Individual / Between Limb Comparisons, Comparisons Amongst
 * Elites, and the Generate Force Plate Report flow.
 */
export const ValdAnalytics = ({ branding }: ValdAnalyticsProps) => {
  const { data: athletes = [], isLoading: athletesLoading, error: athletesError } = useValdAthletes();

  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [resetFiltersKey, setResetFiltersKey] = useState(0);
  const [selectedTestPeers, setSelectedTestPeers] = useState<string>("");

  // Default to the first athletes so the screen is populated on first visit
  useEffect(() => {
    if (athletes.length > 0 && selectedAthleteIds.length === 0) {
      setSelectedAthleteIds(athletes.slice(0, 3).map((a) => a.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes]);

  const { testsByAthlete, isLoading: testsLoading } = useValdMultiAthleteTests(
    selectedAthleteIds,
    MAX_ATHLETES
  );

  const athleteOptions = useMemo(
    () =>
      athletes.map((a) => ({
        value: a.id,
        label: a.teams ? `${a.name} (${a.teams})` : a.name,
      })),
    [athletes]
  );

  /** Dashboard-flavour rows (cm / ms) for the shared analytics sections */
  const dashboardData: TestData[] = useMemo(() => {
    return athletes
      .filter((a) => selectedAthleteIds.includes(a.id))
      .flatMap((a) => valdTestsToTestData(testsByAthlete[a.id] ?? [], a))
      .sort((x, y) => y.test_date.localeCompare(x.test_date));
  }, [athletes, selectedAthleteIds, testsByAthlete]);

  /** Report-flavour rows (m / s) for the force plate PDF generator */
  const reportData: TestData[] = useMemo(() => {
    return athletes
      .filter((a) => selectedAthleteIds.includes(a.id))
      .flatMap((a) => valdTestsToReportData(testsByAthlete[a.id] ?? [], a));
  }, [athletes, selectedAthleteIds, testsByAthlete]);

  // Peers section mirrors the dashboard: pogo & other tests only
  const peerData = useMemo(
    () => dashboardData.filter((d) => d.test_name !== "Isometric Test"),
    [dashboardData]
  );

  const filteredPeerData = useMemo(
    () =>
      selectedTeams.length === 0
        ? peerData
        : peerData.filter((d) => selectedTeams.includes(d.team_name)),
    [peerData, selectedTeams]
  );

  const isLoading = athletesLoading || testsLoading;

  return (
    <div
      className="space-y-6 w-full"
      style={branding ? { fontFamily: branding.font_family || "Inter, system-ui, sans-serif" } : {}}
    >
      <SectionHeader
        title="VALD Analytics"
        description="The same analytics flow as the CC Athletics dashboard, driven by VALD ForceDecks assessments. Load athletes below, then filter each card to drill into a test, athlete, or limb."
      />

      {athletesError && (
        <Alert variant="destructive">
          <AlertDescription>
            VALD is temporarily unavailable (rate limit or connection issue). Wait a minute and
            refresh to reconnect — the rest of the page stays usable.
          </AlertDescription>
        </Alert>
      )}

      {/* Data loader / global filter bar */}
      <Card className="pr-panel">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 min-w-0">
              <label className="pr-filter-label mb-2 block">
                VALD athletes to load (max {MAX_ATHLETES})
              </label>
              <MultiSelectDropdown
                options={athleteOptions}
                value={selectedAthleteIds}
                onChange={(values) => setSelectedAthleteIds(values.slice(0, MAX_ATHLETES))}
                placeholder={athletesLoading ? "Loading VALD athletes…" : "Select athletes"}
                className="bg-white"
              />
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Fetching VALD tests and trial
                    detail…
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3" />
                    {dashboardData.length} VALD test records mapped across{" "}
                    {selectedAthleteIds.length} athlete
                    {selectedAthleteIds.length === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">VALD ForceDecks</Badge>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTeams([]);
                  setSelectedTestPeers("");
                  setResetFiltersKey((k) => k + 1);
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset filters
              </Button>
              <SendReportsModal
                data={dashboardData}
                reportData={reportData}
                triggerLabel="Send Reports"
                sourceLabel="VALD"
                allowEmail={false}
                description="Select a VALD athlete, exclude any tests you don't need, then preview or export the multi-page force plate report."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {dashboardData.length === 0 && !isLoading ? (
        <EmptyState
          icon={Activity}
          title="No VALD test results loaded"
          description="Select one or more VALD athletes above to populate the highlights, peer comparisons, limb symmetry and elite benchmarks."
        />
      ) : (
        <>
          {/* Performance Insights & Athlete Highlights */}
          <HighlightsSection
            data={dashboardData}
            allData={dashboardData}
            selectedTeams={selectedTeams}
            setSelectedTeams={setSelectedTeams}
            resetFiltersKey={resetFiltersKey}
            branding={branding}
          />

          {/* Comparisons Amongst Peers */}
          <ReportFilters
            key="vald-peers"
            data={filteredPeerData}
            allData={peerData}
            onTestSelect={setSelectedTestPeers}
            resetFiltersKey={resetFiltersKey}
            selectedTeams={selectedTeams}
            buttonText="Comparisons Amongst Peers"
            branding={branding}
          />

          {/* Individual / Between Limb Comparisons */}
          <IndividualComparisonSection
            data={dashboardData}
            resetFiltersKey={resetFiltersKey}
            selectedTeams={selectedTeams}
            branding={branding}
          />

          {/* Comparisons Amongst Elites */}
          <EliteComparison
            data={dashboardData}
            resetFiltersKey={resetFiltersKey}
            selectedTeams={selectedTeams}
            branding={branding}
          />
        </>
      )}
    </div>
  );
};

export default ValdAnalytics;
