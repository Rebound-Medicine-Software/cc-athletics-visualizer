
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TestData } from "@/types/forcePlateTypes";
import { useState } from "react";

interface RegionComparisonProps {
  data: TestData[];
}

export const RegionComparison = ({ data }: RegionComparisonProps) => {
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

  // Get unique values for dropdowns from actual data
  const uniqueAthletes = [...new Set(data.map(d => d.athlete_name))];
  const uniqueTests = [...new Set(data.map(d => d.test_name))];
  const uniqueTeams = [...new Set(data.map(d => d.team_name))];

  // Filter data based on current selections
  const filteredData = data.filter(test => {
    if (filters.athleteName && test.athlete_name !== filters.athleteName) return false;
    if (filters.testName && test.test_name !== filters.testName) return false;
    if (filters.teamName && test.team_name !== filters.teamName) return false;
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
          <Select value={filters.athleteName} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, athleteName: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Athlete Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Athletes</SelectItem>
              {uniqueAthletes.map(athlete => (
                <SelectItem key={athlete} value={athlete}>
                  {athlete}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filters.sex} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, sex: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.testName} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, testName: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Test Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tests</SelectItem>
              {uniqueTests.map(test => (
                <SelectItem key={test} value={test}>
                  {test}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filters.metricType} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, metricType: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Metric Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Peak Force">Peak Force</SelectItem>
              <SelectItem value="Peak Power">Peak Power</SelectItem>
              <SelectItem value="Jump Height">Jump Height</SelectItem>
              <SelectItem value="RSI">RSI</SelectItem>
            </SelectContent>
          </Select>
          
          <div></div>
          
          {/* Region Filters Row */}
          <Select value={filters.country} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, country: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UK">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.region} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, region: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Wales">Wales</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.address} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, address: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Address" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Swansea">Swansea</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.teamName} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, teamName: value }))
          }>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Team Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Teams</SelectItem>
              {uniqueTeams.map(team => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
