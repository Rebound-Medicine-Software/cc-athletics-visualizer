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

// Normalise VALD sex values ("Male","Female","M","F","male","female") → "Male"/"Female"/""
function normaliseSex(raw: string): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "";
}

// Derive sport from team name (can be extended with a lookup table)
// For now returns the team name directly — combine with CC Athletics sport names if available
function sportFromTeam(team: string): string {
  return team || "Unknown";
}

/**
 * VALD Hub analytics — mirrors /dashboard > Analytics driven by VALD ForceDecks data.
 * Adds five filters aligned with the CC Athletics dashboard:
 *   1. Team Names     — derived from athlete.teams
 *   2. Sex            — derived from athlete.sex (normalised)
 *   3. Sport          — derived from team name (combined with CC Athletics convention)
 *   4. Test Date      — dependent dropdown: only dates present in the loaded data
 *   5. Metric Type    — handled inside ReportFilters / useMetricCaseLogic (getMetricTypesForTest)
 */
export const ValdAnalytics = ({ branding }: ValdAnalyticsProps) => {
  const { data: athletes = [], isLoading: athletesLoading, error: athletesError } = useValdAthletes();

  // ── Filter state ──────────────────────────────────────────────────────────────
  const [selectedAthleteIds, setSelectedAthleteIds]   = useState<string[]>([]);
  const [selectedTeams,      setSelectedTeams]         = useState<string[]>([]);
  const [selectedSex,        setSelectedSex]           = useState<string[]>([]);
  const [selectedSports,     setSelectedSports]        = useState<string[]>([]);
  const [selectedDates,      setSelectedDates]         = useState<string[]>([]);
  const [resetFiltersKey,    setResetFiltersKey]        = useState(0);
  const [selectedTestPeers,  setSelectedTestPeers]     = useState<string>("");

  // Default to first 3 athletes on mount
  useEffect(() => {
    if (athletes.length > 0 && selectedAthleteIds.length === 0) {
      setSelectedAthleteIds(athletes.slice(0, 3).map((a) => a.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes]);

  // ── Derived filter options ────────────────────────────────────────────────────

  /** Unique team names across all athletes (split comma-separated string) */
  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    athletes.forEach((a) => {
      if (a.teams) a.teams.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => set.add(t));
    });
    return Array.from(set).sort().map((t) => ({ value: t, label: t }));
  }, [athletes]);

  /** Unique normalised sex values */
  const sexOptions = useMemo(() => {
    const set = new Set<string>();
    athletes.forEach((a) => { const s = normaliseSex(a.sex); if (s) set.add(s); });
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [athletes]);

  /** Unique sports (team-derived) */
  const sportOptions = useMemo(() => {
    const set = new Set<string>();
    athletes.forEach((a) => {
      if (a.teams) a.teams.split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => set.add(sportFromTeam(t)));
    });
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [athletes]);

  // ── Athletes that survive team / sex / sport filters ─────────────────────────
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const athleteTeams = a.teams ? a.teams.split(",").map((t) => t.trim()) : [];
      const athleteSex   = normaliseSex(a.sex);
      const athleteSports = athleteTeams.map(sportFromTeam);

      if (selectedTeams.length  > 0 && !selectedTeams.some((t) => athleteTeams.includes(t)))   return false;
      if (selectedSex.length    > 0 && !selectedSex.includes(athleteSex))                       return false;
      if (selectedSports.length > 0 && !selectedSports.some((s) => athleteSports.includes(s))) return false;
      return true;
    });
  }, [athletes, selectedTeams, selectedSex, selectedSports]);

  // When filters change, remove deselected athletes from the selection
  useEffect(() => {
    const validIds = new Set(filteredAthletes.map((a) => a.id));
    setSelectedAthleteIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [filteredAthletes]);

  // ── Athlete multiselect options (filtered) ───────────────────────────────────
  const athleteOptions = useMemo(
    () =>
      filteredAthletes.map((a) => ({
        value: a.id,
        label: a.teams ? `${a.name} (${a.teams})` : a.name,
      })),
    [filteredAthletes]
  );

  // ── Load tests for selected athletes ─────────────────────────────────────────
  const { testsByAthlete, isLoading: testsLoading } = useValdMultiAthleteTests(
    selectedAthleteIds,
    MAX_ATHLETES
  );

  /** Dashboard-flavour rows (cm / ms) */
  const allDashboardData: TestData[] = useMemo(() => {
    return athletes
      .filter((a) => selectedAthleteIds.includes(a.id))
      .flatMap((a) => valdTestsToTestData(testsByAthlete[a.id] ?? [], a))
      .sort((x, y) => y.test_date.localeCompare(x.test_date));
  }, [athletes, selectedAthleteIds, testsByAthlete]);

  /** Report-flavour rows (m / s) for the PDF generator */
  const reportData: TestData[] = useMemo(() => {
    return athletes
      .filter((a) => selectedAthleteIds.includes(a.id))
      .flatMap((a) => valdTestsToReportData(testsByAthlete[a.id] ?? [], a));
  }, [athletes, selectedAthleteIds, testsByAthlete]);

  // ── Test date filter options — dependent on what's actually in the data ───────
  const dateOptions = useMemo(() => {
    const set = new Set(allDashboardData.map((d) => d.test_date));
    return Array.from(set)
      .sort()
      .reverse() // most recent first
      .map((dt) => ({
        value: dt,
        label: new Date(dt + "T00:00:00").toLocaleDateString("en-GB", {
          day: "numeric", month: "short", year: "numeric",
        }),
      }));
  }, [allDashboardData]);

  // ── Apply date filter to dashboard data ───────────────────────────────────────
  const dashboardData: TestData[] = useMemo(() => {
    if (selectedDates.length === 0) return allDashboardData;
    return allDashboardData.filter((d) => selectedDates.includes(d.test_date));
  }, [allDashboardData, selectedDates]);

  // ── Peers data (exclude isometric) ───────────────────────────────────────────
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

  const handleResetAllFilters = () => {
    setSelectedTeams([]);
    setSelectedSex([]);
    setSelectedSports([]);
    setSelectedDates([]);
    setSelectedTestPeers("");
    setResetFiltersKey((k) => k + 1);
  };

  return (
    <div
      className="space-y-6 w-full"
      style={branding ? { fontFamily: branding.font_family || "Inter, system-ui, sans-serif" } : {}}
    >
      <SectionHeader
        title="VALD Analytics"
        description="The same analytics flow as the CC Athletics dashboard, driven by VALD ForceDecks assessments."
      />

      {athletesError && (
        <Alert variant="destructive">
          <AlertDescription>
            VALD is temporarily unavailable. Wait a minute and refresh to reconnect.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Filter bar ─────────────────────────────────────────────────────────── */}
      <Card className="pr-panel">
        <CardContent className="p-4 space-y-4">

          {/* Row 1: Team / Sex / Sport filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Team Names */}
            <div>
              <label className="pr-filter-label mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Team
              </label>
              <MultiSelectDropdown
                options={teamOptions}
                value={selectedTeams}
                onChange={setSelectedTeams}
                placeholder={teamOptions.length === 0 ? "No teams available" : "All teams"}
                className="bg-white"
              />
            </div>

            {/* Sex */}
            <div>
              <label className="pr-filter-label mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sex
              </label>
              <MultiSelectDropdown
                options={sexOptions}
                value={selectedSex}
                onChange={setSelectedSex}
                placeholder={sexOptions.length === 0 ? "Not set in VALD" : "All"}
                className="bg-white"
              />
            </div>

            {/* Sport (derived from team) */}
            <div>
              <label className="pr-filter-label mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sport / Group
              </label>
              <MultiSelectDropdown
                options={sportOptions}
                value={selectedSports}
                onChange={setSelectedSports}
                placeholder={sportOptions.length === 0 ? "No groups available" : "All sports"}
                className="bg-white"
              />
            </div>
          </div>

          {/* Row 2: Athletes + Test Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Athletes (filtered by row 1 selections) */}
            <div>
              <label className="pr-filter-label mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Athletes (max {MAX_ATHLETES})
              </label>
              <MultiSelectDropdown
                options={athleteOptions}
                value={selectedAthleteIds}
                onChange={(values) => setSelectedAthleteIds(values.slice(0, MAX_ATHLETES))}
                placeholder={athletesLoading ? "Loading VALD athletes…" : "Select athletes"}
                className="bg-white"
              />
            </div>

            {/* Test Date — dependent dropdown (only real test dates) */}
            <div>
              <label className="pr-filter-label mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Test Date
              </label>
              <MultiSelectDropdown
                options={dateOptions}
                value={selectedDates}
                onChange={setSelectedDates}
                placeholder={
                  selectedAthleteIds.length === 0
                    ? "Select athletes first"
                    : dateOptions.length === 0
                    ? "No test dates loaded"
                    : "All dates"
                }
                className="bg-white"
              />
            </div>
          </div>

          {/* Status bar + actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching VALD tests…
                </>
              ) : (
                <>
                  <Activity className="h-3 w-3" />
                  {dashboardData.length} test records · {selectedAthleteIds.length} athlete
                  {selectedAthleteIds.length === 1 ? "" : "s"}
                  {selectedDates.length > 0 && ` · ${selectedDates.length} date${selectedDates.length === 1 ? "" : "s"}`}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">VALD ForceDecks</Badge>
              <Button variant="outline" size="sm" onClick={handleResetAllFilters}>
                <RefreshCcw className="mr-1 h-3 w-3" />
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

      {/* ── Analytics sections ─────────────────────────────────────────────────── */}
      {dashboardData.length === 0 && !isLoading ? (
        <EmptyState
          icon={Activity}
          title="No VALD test results loaded"
          description="Select one or more VALD athletes above to populate the highlights, peer comparisons, limb symmetry and elite benchmarks."
        />
      ) : (
        <>
          <HighlightsSection
            data={dashboardData}
            allData={allDashboardData}
            selectedTeams={selectedTeams}
            setSelectedTeams={setSelectedTeams}
            resetFiltersKey={resetFiltersKey}
            branding={branding}
          />

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

          <IndividualComparisonSection
            data={dashboardData}
            resetFiltersKey={resetFiltersKey}
            selectedTeams={selectedTeams}
            branding={branding}
          />

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
