
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";

interface FiltersProps {
  filters: {
    athleteName: string[];
    sex: string;
    testName: string;
    metricType: string;
    country: string[];
    region: string[];
    address: string[];
    teamName: string[];
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      athleteName: string[];
      sex: string;
      testName: string;
      metricType: string;
      country: string[];
      region: string[];
      address: string[];
      teamName: string[];
    }>
  >;
  uniqueAthletes: string[];
  uniqueTests: string[];
  uniqueTeams: string[];
  regionData: {
    countries: string[];
    regions: string[];
    addresses: string[];
    teamNames: string[];
  };
}

export const Filters = ({
  filters,
  setFilters,
  uniqueAthletes,
  uniqueTests,
  uniqueTeams,
  regionData,
}: FiltersProps) => {
  // Convert arrays to options format for dropdowns
  const athleteOptions = uniqueAthletes.map(athlete => ({ value: athlete, label: athlete }));
  const countryOptions = regionData.countries.map(country => ({ value: country, label: country }));
  const regionOptions = regionData.regions.map(region => ({ value: region, label: region }));
  const addressOptions = regionData.addresses.map(address => ({ value: address, label: address }));
  const teamNameOptions = regionData.teamNames.map(team => ({ value: team, label: team }));

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-6 shadow-sm space-y-6 mb-4">
      {/* Individual Filters Row */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center justify-center text-lg font-semibold text-gray-800 min-w-[140px]">
          Individual Filters
        </div>
        <div className="flex gap-4 flex-1 justify-center">
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.athleteName}
              onChange={(value) => setFilters(prev => ({ ...prev, athleteName: value }))}
              placeholder="Select Athletes"
              labelClassName="bg-black text-white text-center h-10"
              dropdownClassName="bg-white border border-gray-200"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Sex</label>
            <Select value={filters.sex} onValueChange={value => setFilters(prev => ({ ...prev, sex: value }))}>
              <SelectTrigger className="bg-black text-white text-center h-10">
                <SelectValue placeholder="Sex" className="text-center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-center">All</SelectItem>
                <SelectItem value="male" className="text-center">Male</SelectItem>
                <SelectItem value="female" className="text-center">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select value={filters.testName} onValueChange={value => setFilters(prev => ({ ...prev, testName: value }))}>
              <SelectTrigger className="bg-black text-white text-center h-10">
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
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select value={filters.metricType} onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))}>
              <SelectTrigger className="bg-black text-white text-center h-10">
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
        </div>
      </div>

      {/* Region Filters Row */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center justify-center text-lg font-semibold text-gray-800 min-w-[140px]">
          Region Filters
        </div>
        <div className="flex gap-4 flex-1 justify-center">
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Country</label>
            <MultiSelectDropdown
              options={countryOptions}
              value={filters.country}
              onChange={(value) => setFilters(prev => ({ ...prev, country: value }))}
              placeholder="Select Countries"
              labelClassName="bg-black text-white text-center h-10"
              dropdownClassName="bg-white border border-gray-200"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Region</label>
            <MultiSelectDropdown
              options={regionOptions}
              value={filters.region}
              onChange={(value) => setFilters(prev => ({ ...prev, region: value }))}
              placeholder="Select Regions"
              labelClassName="bg-black text-white text-center h-10"
              dropdownClassName="bg-white border border-gray-200"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Address</label>
            <MultiSelectDropdown
              options={addressOptions}
              value={filters.address}
              onChange={(value) => setFilters(prev => ({ ...prev, address: value }))}
              placeholder="Select Addresses"
              labelClassName="bg-black text-white text-center h-10"
              dropdownClassName="bg-white border border-gray-200"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Team Name</label>
            <MultiSelectDropdown
              options={teamNameOptions}
              value={filters.teamName}
              onChange={(value) => setFilters(prev => ({ ...prev, teamName: value }))}
              placeholder="Select Teams"
              labelClassName="bg-black text-white text-center h-10"
              dropdownClassName="bg-white border border-gray-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
