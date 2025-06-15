
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TestData } from "@/types/forcePlateTypes";
import { useState, useEffect } from "react";
import { Filters } from "./RegionComparison/Filters";
import { DataTable } from "./RegionComparison/DataTable";
import { MapPlaceholder } from "./RegionComparison/MapPlaceholder";

interface RegionComparisonProps {
  data: TestData[];
  resetFiltersKey?: number;
  selectedTeams?: string[]; // NEW
}

export const RegionComparison = ({ data, resetFiltersKey, selectedTeams = [] }: RegionComparisonProps) => {
  const [filters, setFilters] = useState({
    athleteName: "",
    sex: "",
    testName: "",
    metricType: "",
    country: "UK",
    region: "Wales",
    address: "Swansea",
    teamName: ""
  });

  // Reset all filters when key changes
  useEffect(() => {
    setFilters({
      athleteName: "",
      sex: "",
      testName: "",
      metricType: "",
      country: "UK",
      region: "Wales",
      address: "Swansea",
      teamName: ""
    });
  }, [resetFiltersKey]);

  // Only include teams matching selectedTeams/global filter
  const filteredByTeam = selectedTeams.length > 0
    ? data.filter(d => selectedTeams.includes(d.team_name))
    : data;

  // Group data by unique athlete/team for summary row
  const groupedMap = new Map<string, any>();
  for (const row of filteredByTeam) {
    // Prefer extracting fields from hypothetical elite_athlete_metrics, or fallback to TestData
    const key = `${row.team_name}|||${row.athlete_name}`;
    // We'll only take first matching row for now, ideally would aggregate.
    if (!groupedMap.has(key)) groupedMap.set(key, row);
  }
  const summaryRows = Array.from(groupedMap.values());

  // Build table rows matching the requested columns
  const tableData = summaryRows.map((test, index) => ({
    id: index + 1,
    teamName: test.team_name ?? "",
    athleteName: test.athlete_name ?? "",
    sex: test.sex ?? test.metrics?.sex ?? "",
    sport: test.sport ?? test.metrics?.sport ?? "",
    ageGroup: test.age_group ?? test.metrics?.age_group ?? "",
    weightCategory: test.weight_category_kg ?? (test.metrics?.weight_category_kg ?? null),
    // Metrics: look for the metric in the 'metrics' field if present
    cmjJumpHeight:
      test.metric_type === "Jump Height (cm)"
        ? test.metric_value
        : test.metrics?.jump_height_ft != null
          ? test.metrics.jump_height_ft * 30.48 // convert feet to cm
          : null,
    cmjPeakPower:
      test.metric_type === "Peak Power (W)"
        ? test.metric_value
        : test.metrics?.peak_power ?? null,
    cmjRelPeakPower:
      test.metric_type === "Relative Peak Power (W/kg)"
        ? test.metric_value
        : test.metrics?.rel_peak_power ?? null,
    cmjRSI: 
      test.metric_type === "Reactive Strength Index"
        ? test.metric_value
        : test.metrics?.rsi ?? null,
    imtpPeakForce:
      test.metric_type === "Peak Force (N)"
        ? test.metric_value
        : test.metrics?.peak_force ?? test.metrics?.force_peak ?? null,
    imtpRelPeakForce:
      test.metric_type === "Relative Peak Force (N/kg)"
        ? test.metric_value
        : test.metrics?.rel_peak_force ?? null,
  })).slice(0, 10);

  // Get unique values for dropdowns from filtered data
  const uniqueAthletes = [...new Set(filteredByTeam.map(d => d.athlete_name))];
  const uniqueTests = [...new Set(filteredByTeam.map(d => d.test_name))];
  const uniqueTeams = [...new Set(filteredByTeam.map(d => d.team_name))];

  return (
    <Card className="bg-gray-100 border-gray-300">
      <CardHeader>
        <div className="flex gap-4 mb-4">
          <Button variant="default" className="bg-white text-gray-800 border-gray-300">
            Individual Filters
          </Button>
          <Button variant="outline" className="border-gray-300">
            Region Filters
          </Button>
        </div>
        <Filters
          filters={filters}
          setFilters={setFilters}
          uniqueAthletes={uniqueAthletes}
          uniqueTests={uniqueTests}
          uniqueTeams={uniqueTeams}
        />
        <CardTitle className="text-center text-lg text-gray-800 mb-4">
          Comparisons Amongst Regions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable tableData={tableData} />
        <MapPlaceholder />
      </CardContent>
    </Card>
  );
};

