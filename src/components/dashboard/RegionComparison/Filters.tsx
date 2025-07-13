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
  // Create dependent dropdown options for Individual Filters
  const getFilteredIndividualData = () => {
    // Start with all available data
    let availableAthletes = uniqueAthletes;
    let availableTests = uniqueTests;
    
    // If athletes are selected, filter tests to only those taken by selected athletes
    if (filters.athleteName.length > 0) {
      availableTests = uniqueTests; // For now, keep all tests
    }
    
    // If tests are selected, filter athletes to only those who took selected tests
    if (filters.testName && filters.testName !== "all") {
      availableAthletes = uniqueAthletes; // For now, keep all athletes
    }
    
    return {
      athletes: availableAthletes,
      tests: availableTests
    };
  };

  // Create dependent dropdown options for Region Filters  
  const getFilteredRegionData = () => {
    // Start with all region data, then filter based on selections
    let availableCountries = regionData.countries;
    let availableRegions = regionData.regions;
    let availableAddresses = regionData.addresses;
    let availableTeamNames = regionData.teamNames;
    
    // If countries are selected, filter other fields to match
    if (filters.country.length > 0) {
      // Note: This would need actual relationship data from regionTestingData
      // For now, return all to avoid breaking functionality
      availableRegions = regionData.regions;
      availableAddresses = regionData.addresses;
      availableTeamNames = regionData.teamNames;
    }
    
    // If regions are selected, filter addresses and team names
    if (filters.region.length > 0) {
      availableAddresses = regionData.addresses;
      availableTeamNames = regionData.teamNames;
    }
    
    // If addresses are selected, filter team names
    if (filters.address.length > 0) {
      availableTeamNames = regionData.teamNames;
    }
    
    return {
      countries: availableCountries,
      regions: availableRegions,
      addresses: availableAddresses,
      teamNames: availableTeamNames
    };
  };

  const filteredIndividualData = getFilteredIndividualData();
  const athleteOptions = filteredIndividualData.athletes.map(athlete => ({ value: athlete, label: athlete }));
  
  const filteredRegionData = getFilteredRegionData();
  const countryOptions = filteredRegionData.countries.map(country => ({ value: country, label: country }));
  const regionOptions = filteredRegionData.regions.map(region => ({ value: region, label: region }));
  const addressOptions = filteredRegionData.addresses.map(address => ({ value: address, label: address }));
  const teamNameOptions = filteredRegionData.teamNames.map(team => ({ value: team, label: team }));

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm mb-4 max-w-full overflow-visible">
      {/* All Filters in One Row */}
      <div className="flex items-end justify-center gap-3 flex-wrap">
        <div className="flex items-end justify-center text-sm font-semibold text-gray-800 min-w-[120px] flex-shrink-0 h-[36px]">
          Individual Filters
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Athlete Name</label>
          <MultiSelectDropdown
            options={athleteOptions}
            value={filters.athleteName}
            onChange={(value) => setFilters(prev => ({ ...prev, athleteName: value }))}
            placeholder="Select Athletes"
            labelClassName="bg-black text-white text-center h-9 text-xs"
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Sex</label>
          <Select value={filters.sex} onValueChange={value => setFilters(prev => ({ ...prev, sex: value }))}>
            <SelectTrigger className="bg-black text-white text-center h-9 text-xs">
              <SelectValue placeholder="Sex" className="text-center" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all" className="text-center text-xs">All</SelectItem>
              <SelectItem value="male" className="text-center text-xs">Male</SelectItem>
              <SelectItem value="female" className="text-center text-xs">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Test Name</label>
          <Select value={filters.testName} onValueChange={value => setFilters(prev => ({ ...prev, testName: value }))}>
            <SelectTrigger className="bg-black text-white text-center h-9 text-xs">
              <SelectValue placeholder="Test Name" className="text-center" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all" className="text-center text-xs">All Tests</SelectItem>
              {filteredIndividualData.tests.map(test => (
                <SelectItem key={test} value={test} className="text-center text-xs">
                  {test}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Metric Type</label>
          <Select value={filters.metricType} onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))}>
            <SelectTrigger className="bg-black text-white text-center h-9 text-xs">
              <SelectValue placeholder="Metric Type" className="text-center" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="Peak Force" className="text-center text-xs">Peak Force</SelectItem>
              <SelectItem value="Peak Power" className="text-center text-xs">Peak Power</SelectItem>
              <SelectItem value="Jump Height" className="text-center text-xs">Jump Height</SelectItem>
              <SelectItem value="RSI" className="text-center text-xs">RSI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end justify-center text-sm font-semibold text-gray-800 min-w-[120px] flex-shrink-0 ml-4 h-[36px]">
          Region Filters
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Country</label>
          <MultiSelectDropdown
            options={countryOptions}
            value={filters.country}
            onChange={(value) => setFilters(prev => ({ ...prev, country: value }))}
            placeholder="Select Countries"
            labelClassName="bg-black text-white text-center h-9 text-xs"
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Region</label>
          <MultiSelectDropdown
            options={regionOptions}
            value={filters.region}
            onChange={(value) => setFilters(prev => ({ ...prev, region: value }))}
            placeholder="Select Regions"
            labelClassName="bg-black text-white text-center h-9 text-xs"
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Address</label>
          <MultiSelectDropdown
            options={addressOptions}
            value={filters.address}
            onChange={(value) => setFilters(prev => ({ ...prev, address: value }))}
            placeholder="Select Addresses"
            labelClassName="bg-black text-white text-center h-9 text-xs"
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Team Name</label>
          <MultiSelectDropdown
            options={teamNameOptions}
            value={filters.teamName}
            onChange={(value) => setFilters(prev => ({ ...prev, teamName: value }))}
            placeholder="Select Teams"
            labelClassName="bg-black text-white text-center h-9 text-xs"
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
      </div>
    </div>
  );
};