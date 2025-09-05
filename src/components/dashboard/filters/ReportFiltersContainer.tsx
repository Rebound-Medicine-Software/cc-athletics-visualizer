
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComparisonChart } from "../ComparisonChart";
import { VideoBox } from "../VideoBox";
import { IndividualFilters } from "./IndividualFilters";
import { TestData } from "@/types/forcePlateTypes";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { formatDate } from "@/utils/dateUtils";
import { getMetricTypesForTest } from "./filterUtils";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
  allData: TestData[];
  metricCardsSlot?: React.ReactNode;
  resetFiltersKey?: number;
  selectedTeams: string[];
  buttonText?: string;
  branding?: any;
}

export function ReportFiltersContainer({
  data,
  onTestSelect,
  allData,
  metricCardsSlot,
  resetFiltersKey,
  selectedTeams = [],
  buttonText,
  branding,
}: ReportFiltersProps) {
  // INDEPENDENT FILTER STATE - each instance manages its own state
  const [filters, setFilters] = useState({
    sex: "",
    selectedAthletes: [] as string[],
    testNames: "",
    metricTypes: ""
  });


  // Reset filters if resetFiltersKey changes
  useEffect(() => {
    setFilters({
      sex: "",
      selectedAthletes: [],
      testNames: "",
      metricTypes: ""
    });
    onTestSelect("");
    // eslint-disable-next-line
  }, [resetFiltersKey]);

  // Chart Data - filtered by this component's own filter state
  const getFilteredDataForChart = () => {
    return data.filter(test => {
      const testMatch = !filters.testNames || test.test_name === filters.testNames;
      const sexMatch = !filters.sex || test.gender === filters.sex.toLowerCase();
      const athleteMatch = filters.selectedAthletes.length === 0 || filters.selectedAthletes.includes(test.athlete_name);
      return testMatch && sexMatch && athleteMatch;
    });
  };

  // Internal test select handler - only updates this component's state
  const handleTestSelect = (testName: string) => {
    setFilters(prev => ({
      ...prev,
      testNames: testName
    }));
    onTestSelect(testName);
  };


  return (
    <div style={branding ? { fontFamily: branding.font_family || 'Inter, system-ui, sans-serif' } : {}}>
      <Card 
        className="border-2"
        style={{
          backgroundColor: branding?.secondary_color ? `${branding.secondary_color}10` : 'hsl(var(--card))',
          borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
        }}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex justify-center mb-4">
            <Button 
              variant="default" 
              className="w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center cursor-default text-white"
              style={{
                backgroundColor: branding?.accent_color || 'hsl(var(--accent))',
                borderColor: branding?.accent_color || 'hsl(var(--accent))'
              }}
              aria-label="Comparisons Amongst Peers"
            >
              Comparisons Amongst Peers
            </Button>
          </div>

        {/* Individual Filters - using exact IndividualComparisonSection dropdown structure */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Test Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select 
              value={filters.testNames} 
              onValueChange={(value) => {
                setFilters(prev => ({
                  ...prev,
                  testNames: value,
                  sex: "",
                  selectedAthletes: [],
                  metricTypes: ""
                }));
                onTestSelect(value);
              }}
            >
              <SelectTrigger className="bg-white text-center">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {Array.from(new Set(allData.filter(d => 
                  selectedTeams.length === 0 || selectedTeams.includes(d.team_name)
                ).map(d => d.test_name))).filter(t => t !== "All Tests" && t !== "Isometric Test").map(testName => (
                  <SelectItem key={testName} value={testName}>
                    {testName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sex */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Sex</label>
            {!filters.testNames ? (
              <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center justify-center">
                Select Sex
              </div>
            ) : (
              <Select 
                value={filters.sex} 
                onValueChange={(value) => {
                  setFilters(prev => ({
                    ...prev,
                    sex: value,
                    selectedAthletes: [],
                    metricTypes: ""
                  }));
                }}
              >
                <SelectTrigger className="bg-white text-center">
                  <SelectValue placeholder="Select Sex" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {Array.from(new Set(
                    allData.filter(d => 
                      (selectedTeams.length === 0 || selectedTeams.includes(d.team_name)) &&
                      (!filters.testNames || d.test_name === filters.testNames) &&
                      d.gender
                    ).map(d => d.gender)
                  )).map(sex => (
                    <SelectItem key={sex} value={sex!.charAt(0).toUpperCase() + sex!.slice(1)}>
                      {sex!.charAt(0).toUpperCase() + sex!.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Athlete Name(s) - Multi-Select */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name(s)</label>
            {!filters.testNames ? (
              <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center justify-center">
                Select Athletes
              </div>
            ) : (
              <MultiSelectDropdown
                options={Array.from(new Set(
                  allData.filter(d => 
                    (selectedTeams.length === 0 || selectedTeams.includes(d.team_name)) &&
                    (!filters.testNames || d.test_name === filters.testNames) &&
                    (!filters.sex || d.gender === filters.sex.toLowerCase())
                  ).map(d => d.athlete_name)
                )).map(name => ({ value: name, label: name }))}
                value={filters.selectedAthletes}
                onChange={(values) => {
                  setFilters(prev => ({
                    ...prev,
                    selectedAthletes: values,
                    metricTypes: ""
                  }));
                }}
                placeholder="Select Athletes"
                className="bg-white"
                labelClassName="bg-white"
              />
            )}
          </div>

          {/* Metric Type */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select 
              value={filters.metricTypes} 
              onValueChange={(value) => {
                setFilters(prev => ({
                  ...prev,
                  metricTypes: value
                }));
              }}
              disabled={filters.selectedAthletes.length === 0}
            >
              <SelectTrigger className={`${filters.selectedAthletes.length === 0 ? "bg-gray-100 opacity-60" : "bg-white"} text-center`}>
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {getMetricTypesForTest(filters.testNames).map(metricType => (
                  <SelectItem key={metricType} value={metricType}>
                    {metricType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metric Cards */}
        {metricCardsSlot && (
          <div className="mb-6">
            {metricCardsSlot}
          </div>
        )}

        {/* Chart and Video */}
        <div className="flex flex-col md:flex-row gap-8 mt-2">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div className="bg-transparent rounded-lg h-[480px] min-h-[370px] max-h-[480px] overflow-y-auto flex flex-col" style={{
              boxSizing: "border-box"
            }}>
              <ComparisonChart 
                data={getFilteredDataForChart()} 
                testName={filters.testNames} 
                metricType={filters.metricTypes} 
                branding={branding}
              />
            </div>
          </div>
          {/* Video box */}
          <div className="w-full md:w-[420px] shrink-0">
            <VideoBox testName={filters.testNames} branding={branding} />
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Re-export under old name for compatibility
export { ReportFiltersContainer as ReportFilters };
