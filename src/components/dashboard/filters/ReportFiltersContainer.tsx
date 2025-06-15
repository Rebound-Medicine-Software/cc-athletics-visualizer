
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "../ComparisonChart";
import { VideoBox } from "../VideoBox";
import { IndividualFilters } from "./IndividualFilters";
import { TestData } from "@/types/forcePlateTypes";
import { EliteComparisonFilters } from "./EliteComparisonFilters";
import { EliteComparisonChart } from "../EliteComparisonChart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
  selectedTeams: string[];
}

export function ReportFiltersContainer({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
  selectedTeams = []
}: ReportFiltersProps) {

  // FILTER STATE
  const [filters, setFilters] = useState({
    selectedAthletes: [] as string[],
    testDates: "",
    testNames: "",
    metricTypes: ""
  });

  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      selectedAthletes: [],
      testDates: "",
      testNames: "",
      metricTypes: ""
    });
    onTestSelect("");
    // eslint-disable-next-line
  }, [resetFiltersKey, onTestSelect]);

  // Chart Data
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = !filters.testNames || test.test_name === filters.testNames;
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      const dateMatch = !filters.testDates || test.test_date === filters.testDates;
      return testMatch && athleteMatch && dateMatch;
    });
  };

  // --- NEW FEATURE: ELITE COMPARISON FILTERS ---
  // Fetch elite metrics via react-query
  const { data: eliteMetricsRaw = [], isLoading: eliteLoading } = useQuery({
    queryKey: ['elite_athlete_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elite_athlete_metrics")
        .select("*");
      if (error) { throw error; }
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10m
  });

  // State for comparison + individual filter values
  const [selectedEliteFilters, setSelectedEliteFilters] = useState({
    sport: "",
    sex: "",
    weight_category_kg: [],
    age_group: [],
  });
  const [selectedIndividualFilters, setSelectedIndividualFilters] = useState({
    athlete_names: [],
    weights: [],
    test_name: "",
  });
  const [metricType, setMetricType] = useState("");

  // Compute filtered elite metric value (rightmost, gold)
  const comparisonEliteRow = useMemo(() => {
    return eliteMetricsRaw.find(row =>
      (!selectedEliteFilters.sport || row.sport === selectedEliteFilters.sport) &&
      (!selectedEliteFilters.sex || row.sex === selectedEliteFilters.sex) &&
      (selectedEliteFilters.weight_category_kg.length === 0 || selectedEliteFilters.weight_category_kg.includes(String(row.weight_category_kg))) &&
      (selectedEliteFilters.age_group.length === 0 || selectedEliteFilters.age_group.includes(row.age_group)) &&
      (!metricType || row.metric_type === metricType)
    ) || null;
  }, [eliteMetricsRaw, selectedEliteFilters, metricType]);

  // Filter individual data
  const filteredAthletes = useMemo(() => {
    return data.filter(d =>
      (selectedIndividualFilters.athlete_names.length === 0 || selectedIndividualFilters.athlete_names.includes(d.athlete_name)) &&
      (selectedIndividualFilters.weights.length === 0 || (
        d.metrics &&
        "body_mass" in d.metrics &&
        d.metrics.body_mass !== undefined &&
        selectedIndividualFilters.weights.includes(String(d.metrics.body_mass))
      )) &&
      (!selectedIndividualFilters.test_name || d.test_name === selectedIndividualFilters.test_name) &&
      (!metricType || (d.metrics && Object.keys(d.metrics).includes(metricType)))
    );
  }, [data, selectedIndividualFilters, metricType]);

  // Compose chart data for individuals: top 6
  const individualChartData = useMemo(() => {
    return filteredAthletes
      .map(d => {
        let value = d.metrics && metricType ? Number(d.metrics[metricType]) : null;
        // Only include value if it's valid, and safely access team_name, athlete_name
        return value !== null && !isNaN(value)
          ? {
              name: d.athlete_name,
              value,
              team: d.team_name
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.value - a!.value))
      .slice(0, 6) as { name: string; value: number; team?: string }[];
  }, [filteredAthletes, metricType]);

  // Called when any filter updates
  const handleEliteFilterUpdate = () => {
    // Just for now - no extra effect
  };

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center">
            Individual Filters
          </Button>
        </div>

        {/* Individual Filters */}
        <IndividualFilters
          data={data}
          allData={allData}
          selectedTeams={selectedTeams}
          filters={filters}
          setFilters={setFilters}
          onTestSelect={onTestSelect}
          resetFiltersKey={resetFiltersKey}
        />

        {/* --- COPY: Comparisons Amongst Elites --- */}
        <EliteComparisonFilters
          eliteMetrics={eliteMetricsRaw}
          athleteData={allData}
          selectedEliteFilters={selectedEliteFilters}
          setSelectedEliteFilters={setSelectedEliteFilters}
          selectedIndividualFilters={selectedIndividualFilters}
          setSelectedIndividualFilters={setSelectedIndividualFilters}
          metricType={metricType}
          setMetricType={setMetricType}
          onFilterChange={handleEliteFilterUpdate}
        />

        {/* EliteComparisonChart replaces MetricCards/Video! */}
        <EliteComparisonChart
          individuals={individualChartData}
          eliteValue={comparisonEliteRow && metricType ? Number(comparisonEliteRow.metric_value) : null}
          metricType={metricType}
        />

        {/* Chart and Video from original block REMOVED */}
        {/* <ComparisonChart ... /> and <VideoBox ... /> are removed from this part */}

        {/* Metric Cards from original INDIVIDUAL filters REMAIN (if any, above only) */}
        {metricCardsSlot && (
          <div className="mb-6">
            {metricCardsSlot}
          </div>
        )}
        {/* The Region Comparison stays as in the original layout, nothing changes here */}
        <ComparisonChart
                data={getFilteredDataForChart()}
                testName={filters.testNames}
                metricType={filters.metricTypes}
              />
      </CardContent>
    </Card>
  );
}

// Re-export under old name for compatibility
export { ReportFiltersContainer as ReportFilters };
