
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FiltersProps {
  filters: {
    athleteName: string;
    sex: string;
    testName: string;
    metricType: string;
    country: string;
    region: string;
    address: string;
    teamName: string;
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      athleteName: string;
      sex: string;
      testName: string;
      metricType: string;
      country: string;
      region: string;
      address: string;
      teamName: string;
    }>
  >;
  uniqueAthletes: string[];
  uniqueTests: string[];
  uniqueTeams: string[];
}

export const Filters = ({
  filters,
  setFilters,
  uniqueAthletes,
  uniqueTests,
  uniqueTeams,
}: FiltersProps) => (
  <div className="grid grid-cols-5 gap-4 mb-4">
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
);
