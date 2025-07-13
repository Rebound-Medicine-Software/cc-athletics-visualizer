
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TestData } from "@/types/forcePlateTypes";
import { useState, useEffect } from "react";
import { Filters } from "./RegionComparison/Filters";
import { DataTable } from "./RegionComparison/DataTable";
import { SatelliteMap } from "../SatelliteMap";
import { useRegionData } from "@/hooks/useRegionData";

interface RegionComparisonProps {
  data: TestData[];
  resetFiltersKey?: number;
  selectedTeams?: string[]; // NEW
}

export const RegionComparison = ({ data, resetFiltersKey, selectedTeams = [] }: RegionComparisonProps) => {
  const { data: regionTestingData, isLoading: regionDataLoading } = useRegionData();
  
  const [filters, setFilters] = useState({
    athleteName: [] as string[],
    sex: "",
    testName: "",
    metricType: "",
    country: [] as string[],
    region: [] as string[],
    address: [] as string[],
    teamName: [] as string[]
  });

  // Reset all filters when key changes
  useEffect(() => {
    setFilters({
      athleteName: [],
      sex: "",
      testName: "",
      metricType: "",
      country: [],
      region: [],
      address: [],
      teamName: []
    });
  }, [resetFiltersKey]);

  // Process region data for dropdowns
  const regionData = {
    countries: regionTestingData ? [...new Set(regionTestingData.map(item => item.country).filter(Boolean))] : [],
    regions: regionTestingData ? [...new Set(regionTestingData.map(item => item.region).filter(Boolean))] : [],
    addresses: regionTestingData ? [...new Set(regionTestingData.map(item => item.address).filter(Boolean))] : [],
    teamNames: regionTestingData ? [...new Set(regionTestingData.map(item => item["Team Name"]).filter(Boolean))] : []
  };

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

  // Filter by individual filters first
  let filteredData = filteredByTeam;
  
  if (filters.athleteName.length > 0) {
    filteredData = filteredData.filter(d => filters.athleteName.includes(d.athlete_name));
  }
  
  if (filters.testName && filters.testName !== "all") {
    filteredData = filteredData.filter(d => d.test_name === filters.testName);
  }

  // Build simplified table data - since TestData doesn't have metric_type/metric_value,
  // we'll extract relevant metrics from the metrics object
  const tableData = filteredData
    .map((test, index) => {
      let metricValue = 0;
      let metricType = filters.metricType || "Peak Force";
      
      // Extract metric value based on selected metric type
      if (filters.metricType === "Peak Force" && test.metrics) {
        metricValue = (test.metrics as any).peak_force || (test.metrics as any).force_peak || 0;
      } else if (filters.metricType === "Peak Power" && test.metrics) {
        metricValue = (test.metrics as any).peak_power || (test.metrics as any).avg_power || 0;
      } else if (filters.metricType === "Jump Height" && test.metrics) {
        metricValue = (test.metrics as any).jump_height_ft ? (test.metrics as any).jump_height_ft * 30.48 : (test.metrics as any).avg_jump_height || 0;
      } else if (filters.metricType === "RSI" && test.metrics) {
        metricValue = (test.metrics as any).rsi || (test.metrics as any).avg_rsi || 0;
      }
      
      return {
        id: index + 1,
        teamName: test.team_name ?? "",
        athleteName: test.athlete_name ?? "",
        metricType: metricType,
        metricValue: metricValue,
      };
    })
    .filter(row => row.metricValue > 0)
    .sort((a, b) => (b.metricValue || 0) - (a.metricValue || 0))
    .slice(0, 20);

  // Get unique values for dropdowns from filtered data
  const uniqueAthletes = [...new Set(filteredByTeam.map(d => d.athlete_name))];
  const uniqueTests = [...new Set(filteredByTeam.map(d => d.test_name))];
  const uniqueTeams = [...new Set(filteredByTeam.map(d => d.team_name))];

  return (
    <Card className="bg-gray-100 border-gray-300">
      <CardHeader>
        <Filters
          filters={filters}
          setFilters={setFilters}
          uniqueAthletes={uniqueAthletes}
          uniqueTests={uniqueTests}
          uniqueTeams={uniqueTeams}
          regionData={regionData}
        />
        <CardTitle className="text-center text-lg text-gray-800 mb-4">
          Comparisons Amongst Regions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable tableData={tableData} />
        <SatelliteMap 
          regionFilters={{
            country: filters.country,
            region: filters.region,
            address: filters.address,
            teamName: filters.teamName
          }}
          individualFilters={{
            athleteName: filters.athleteName,
            sex: filters.sex,
            testName: filters.testName,
            metricType: filters.metricType
          }}
          data={filteredByTeam}
          regionData={regionData}
        />
      </CardContent>
    </Card>
  );
};

