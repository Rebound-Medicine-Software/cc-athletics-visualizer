import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useValdAthletes, useValdTests } from "@/hooks/useVald";
import { valdTestsToTestData, mergeWithCCData } from "@/lib/valdToCCAthletics";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";

/**
 * Bridges VALD test results into the CC Athletics analytics components,
 * so VALD data renders in the same charts alongside CC Athletics data.
 */
export const ValdCCAnalytics = () => {
  const [athleteId, setAthleteId] = useState<string>("");
  const [selectedTest, setSelectedTest] = useState<string>("");

  const { data: athletes = [], isLoading: athletesLoading } = useValdAthletes();
  const { data: valdTests = [], isLoading: testsLoading } = useValdTests(athleteId || null);
  const { data: ccData = [] } = useSupabaseData();

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === athleteId),
    [athletes, athleteId]
  );

  // VALD tests translated into CC Athletics TestData[]
  const ccCompatibleTests = useMemo(
    () => (selectedAthlete ? valdTestsToTestData(valdTests, selectedAthlete) : []),
    [valdTests, selectedAthlete]
  );

  // VALD + CC Athletics rows in one dataset for the shared charts
  const combinedData = useMemo(() => {
    if (!selectedAthlete) return ccData;
    return mergeWithCCData(ccData, valdTests, selectedAthlete);
  }, [ccData, valdTests, selectedAthlete]);

  const testOptions = useMemo(
    () => Array.from(new Set(combinedData.map((d) => d.test_name).filter(Boolean))).sort(),
    [combinedData]
  );

  const activeTest = selectedTest || testOptions[0] || "";

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          Unified Analytics
          <Badge variant="secondary">VALD + CC Athletics</Badge>
          {ccCompatibleTests.length > 0 && (
            <Badge variant="outline">{ccCompatibleTests.length} VALD tests mapped</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={athleteId} onValueChange={setAthleteId}>
            <SelectTrigger>
              <SelectValue placeholder={athletesLoading ? "Loading athletes…" : "Select VALD athlete"} />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeTest} onValueChange={setSelectedTest}>
            <SelectTrigger>
              <SelectValue placeholder="Select test" />
            </SelectTrigger>
            <SelectContent>
              {testOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {testsLoading && <p className="text-sm text-muted-foreground">Loading VALD tests…</p>}

        {activeTest ? (
          <>
            <MetricCards selectedTest={activeTest} data={combinedData} />
            <ComparisonChart data={combinedData.filter((d) => d.test_name === activeTest)} testName={activeTest} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a VALD athlete to see their results in the shared analytics charts.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ValdCCAnalytics;
