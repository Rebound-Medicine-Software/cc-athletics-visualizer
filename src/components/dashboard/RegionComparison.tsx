import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TestData } from "@/types/forcePlateTypes";
import { useState, useEffect } from "react";

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
        
        <div className="grid grid-cols-5 gap-4 mb-4">
          {/* Individual Filters Row */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <Select value={filters.athleteName} onValueChange={value => setFilters(prev => ({ ...prev, athleteName: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Athlete Name" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-center">All Athletes</SelectItem>
                {uniqueAthletes.map(athlete => (
                  <SelectItem key={athlete} value={athlete} className="text-center">
                    {athlete}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Sex</label>
            <Select value={filters.sex} onValueChange={value => setFilters(prev => ({ ...prev, sex: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Sex" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-center">All</SelectItem>
                <SelectItem value="male" className="text-center">Male</SelectItem>
                <SelectItem value="female" className="text-center">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select value={filters.testName} onValueChange={value => setFilters(prev => ({ ...prev, testName: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Test Name" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-center">All Tests</SelectItem>
                {uniqueTests.map(test => (
                  <SelectItem key={test} value={test} className="text-center">
                    {test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select value={filters.metricType} onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Metric Type" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Peak Force" className="text-center">Peak Force</SelectItem>
                <SelectItem value="Peak Power" className="text-center">Peak Power</SelectItem>
                <SelectItem value="Jump Height" className="text-center">Jump Height</SelectItem>
                <SelectItem value="RSI" className="text-center">RSI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div></div>
          
          {/* Region Filters Row */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Country</label>
            <Select value={filters.country} onValueChange={value => setFilters(prev => ({ ...prev, country: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Country" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UK" className="text-center">United Kingdom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Region</label>
            <Select value={filters.region} onValueChange={value => setFilters(prev => ({ ...prev, region: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Region" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wales" className="text-center">Wales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Address</label>
            <Select value={filters.address} onValueChange={value => setFilters(prev => ({ ...prev, address: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Address" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Swansea" className="text-center">Swansea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Team Name</label>
            <Select value={filters.teamName} onValueChange={value => setFilters(prev => ({ ...prev, teamName: value }))}>
              <SelectTrigger className="bg-black text-white text-center">
                <SelectValue placeholder="Team Name" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-center">All Teams</SelectItem>
                {uniqueTeams.map(team => (
                  <SelectItem key={team} value={team} className="text-center">
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardTitle className="text-center text-lg text-gray-800 mb-4">
          Comparisons Amongst Regions
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Sport</th>
                <th className="px-4 py-2 text-left">Team Name</th>
                <th className="px-4 py-2 text-left">Athlete Name</th>
                <th className="px-4 py-2 text-left">Metric Selected</th>
                <th className="px-4 py-2 text-left">Individual Data Values</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? (
                tableData.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-teal-100" : "bg-white"}>
                    <td className="px-4 py-2">{row.id}</td>
                    <td className="px-4 py-2">{row.sport}</td>
                    <td className="px-4 py-2">{row.teamName}</td>
                    <td className="px-4 py-2">{row.athleteName}</td>
                    <td className="px-4 py-2">{row.metricSelected}</td>
                    <td className="px-4 py-2 font-mono">
                      {typeof row.value === 'number' ? row.value.toFixed(2) : row.value}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No data available with current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Map placeholder - Google Sheets integration will be added here */}
        <div className="mt-6 h-64 bg-teal-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">🗺️</div>
            <p>Regional Map Visualization</p>
            <p className="text-sm">Google Sheets integration coming next</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// NOTE: This file is now 250+ lines. Consider refactoring it for maintainability.
