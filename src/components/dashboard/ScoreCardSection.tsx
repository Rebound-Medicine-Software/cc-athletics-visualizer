
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";

interface ScoreCardSectionProps {
  data: TestData[];
  selectedTeams: string[];
  resetFiltersKey?: number;
}

export function ScoreCardSection({ 
  data, 
  selectedTeams, 
  resetFiltersKey 
}: ScoreCardSectionProps) {
  const [selectedAthlete, setSelectedAthlete] = useState<string>("all");
  const [selectedTestDate, setSelectedTestDate] = useState<string>("all");

  // Reset filters when resetFiltersKey changes
  useEffect(() => {
    setSelectedAthlete("all");
    setSelectedTestDate("all");
  }, [resetFiltersKey]);

  // Filter data based on selected teams (from Performance Insights)
  const teamFilteredData = selectedTeams.length === 0
    ? data
    : data.filter(d => selectedTeams.includes(d.team_name));

  // Get unique athletes from team-filtered data
  const uniqueAthletes = Array.from(
    new Set(teamFilteredData.map(d => d.athlete_name))
  ).sort();

  // Get unique test dates from athlete-filtered data
  const athleteFilteredData = selectedAthlete === "all"
    ? teamFilteredData
    : teamFilteredData.filter(d => d.athlete_name === selectedAthlete);

  const uniqueTestDates = Array.from(
    new Set(athleteFilteredData.map(d => d.test_date))
  ).sort();

  // Get scorecard data based on current filters
  const getScorecardData = () => {
    let filteredData = teamFilteredData;

    if (selectedAthlete !== "all") {
      filteredData = filteredData.filter(d => d.athlete_name === selectedAthlete);
    }

    if (selectedTestDate !== "all") {
      filteredData = filteredData.filter(d => d.test_date === selectedTestDate);
    }

    // Calculate metrics for each test type
    const testTypes = Array.from(new Set(filteredData.map(d => d.test_name)));
    
    return testTypes.map(testType => {
      const testData = filteredData.filter(d => d.test_name === testType);
      const totalTests = testData.length;
      
      // Calculate average of a representative metric (using first available metric)
      let avgValue = 0;
      if (testData.length > 0 && testData[0].metrics) {
        const firstMetric = Object.values(testData[0].metrics)[0];
        const values = testData.map(d => {
          const metricValue = Object.values(d.metrics)[0];
          return typeof metricValue === 'number' ? metricValue : 0;
        });
        avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      }

      return {
        testType,
        totalTests,
        avgValue: Number(avgValue.toFixed(1)),
        trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend
        trendPercent: (Math.random() * 50 + 10).toFixed(1) // Mock percentage
      };
    });
  };

  const scorecardData = getScorecardData();

  return (
    <Card className="bg-white border-teal-200 mb-6">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center">
            Scorecard Filters
          </Button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 justify-items-center">
          {/* Athlete Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">
              Athlete Name
            </label>
            <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Athlete" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Athletes</SelectItem>
                {uniqueAthletes.map((athlete) => (
                  <SelectItem key={athlete} value={athlete}>
                    {athlete}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Date */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">
              Test Date
            </label>
            <Select value={selectedTestDate} onValueChange={setSelectedTestDate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {uniqueTestDates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scorecard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {scorecardData.map((metric, index) => (
            <Card key={index} className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                {/* Test Type Dropdown */}
                <div className="mb-3">
                  <Select value={metric.testType} disabled>
                    <SelectTrigger className="w-full h-8 text-sm bg-teal-100 border-teal-300">
                      <SelectValue placeholder="Select Test Name" />
                    </SelectTrigger>
                  </Select>
                </div>

                {/* Metrics */}
                <div className="space-y-2 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.avgValue}
                  </div>
                  <div className="text-sm text-gray-600">
                    {metric.totalTests} tests
                  </div>
                  <div className={`text-xs flex items-center justify-center gap-1 ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>{metric.trend === 'up' ? '↗' : '↘'}</span>
                    <span>{metric.trendPercent}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {scorecardData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Please select a 'Test Name' to view scorecard data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
