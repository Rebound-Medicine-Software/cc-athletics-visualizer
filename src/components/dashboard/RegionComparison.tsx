
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TestData } from "@/types/forcePlateTypes";

interface RegionComparisonProps {
  data: TestData[];
}

export const RegionComparison = ({ data }: RegionComparisonProps) => {
  // Sample data for the region comparison table
  const regionData = data.slice(0, 3).map((test, index) => ({
    id: index + 2,
    sport: "MMA",
    teamName: test.team_name,
    athleteName: test.athlete_name,
    metric: "Peak Power",
    value: typeof test.metrics === 'object' && test.metrics && 'peak_force' in test.metrics 
      ? Math.floor((test.metrics as any).peak_force || 5000)
      : Math.floor(Math.random() * 2000 + 4000)
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
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Athlete Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Athletes</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Test Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tests</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Metric Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Metrics</SelectItem>
            </SelectContent>
          </Select>
          
          <div></div>
          
          {/* Region Filters Row */}
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uk">United Kingdom</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wales">Wales</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Address" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="swansea">Swansea</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="bg-black text-white">
              <SelectValue placeholder="Team Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="evolve">Evolve Physiotherapy</SelectItem>
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
              {regionData.map((row, index) => (
                <tr key={row.id} className={index % 2 === 0 ? "bg-teal-100" : "bg-white"}>
                  <td className="px-4 py-2">{row.id}</td>
                  <td className="px-4 py-2">{row.sport}</td>
                  <td className="px-4 py-2">{row.teamName}</td>
                  <td className="px-4 py-2">{row.athleteName}</td>
                  <td className="px-4 py-2">{row.metric}</td>
                  <td className="px-4 py-2 font-mono">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Map placeholder */}
        <div className="mt-6 h-64 bg-teal-100 rounded-lg flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">🗺️</div>
            <p>Regional Map Visualization</p>
            <p className="text-sm">Showing athlete locations and performance data</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
