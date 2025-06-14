
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
}

export const RegionComparison = ({ data, resetFiltersKey }: RegionComparisonProps) => {
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

  // Get unique values for dropdowns from actual data
  const uniqueAthletes = [...new Set(data.map(d => d.athlete_name))];
  const uniqueTests = [...new Set(data.map(d => d.test_name))];
  const uniqueTeams = [...new Set(data.map(d => d.team_name))];

  // Filter data based on current selections
  const filteredData = data.filter(test => {
    if (filters.athleteName && filters.athleteName !== "all" && test.athlete_name !== filters.athleteName) return false;
    if (filters.testName && filters.testName !== "all" && test.test_name !== filters.testName) return false;
    if (filters.teamName && filters.teamName !== "all" && test.team_name !== filters.teamName) return false;
    return true;
  });

  // Get the selected metric value for each athlete
  const getMetricValue = (test: TestData, metricType: string) => {
    if (!test.metrics || typeof test.metrics !== 'object') return 'N/A';
    const metrics = test.metrics as any;
    switch (metricType) {
      case 'Peak Force':
        return metrics.peak_force || metrics.force_peak || 'N/A';
      case 'Peak Power':
        return metrics.peak_power || 'N/A';
      case 'Jump Height':
        return metrics.jump_height_ft || metrics.avg_jump_height || 'N/A';
      case 'RSI':
        return metrics.rsi || metrics.avg_rsi || 'N/A';
      default:
        return 'N/A';
    }
  };

  // Create table data from filtered results
  const tableData = filteredData.slice(0, 10).map((test, index) => ({
    id: index + 1,
    sport: "Performance Testing", // Default since we don't have sport data
    teamName: test.team_name,
    athleteName: test.athlete_name,
    metricSelected: filters.metricType || 'Peak Force',
    value: getMetricValue(test, filters.metricType || 'Peak Force')
  }));

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
