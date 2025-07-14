
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
  testData: any[];
}

// Metric type mapping based on test name
const getMetricTypesForTest = (testName: string): string[] => {
  switch (testName) {
    case "Drop Jump":
      return ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"];
    case "Countermovement Jump":
      return ["Jump Height (cm)", "Peak Power", "Relative Peak Power", "Reactive Strength Index"];
    case "Squat Jump":
      return ["Jump Height (cm)", "Take-off Velocity", "Average Rate of Force Development", "Average Propulsive Power"];
    case "Pogo Jump":
      return ["Jump Height (Pogo)", "Power", "Flight Time", "Reactive Strength Index"];
    default:
      // Isometric tests
      return ["Maximum Rate of Force Development", "Force at Max Rate of Force Development", "Peak Force", "Early Explosive Power"];
  }
};

export const Filters = ({
  filters,
  setFilters,
  uniqueAthletes,
  uniqueTests,
  uniqueTeams,
  regionData,
  testData,
}: FiltersProps) => {
  // Create dependent dropdown options for Individual Filters
  const getFilteredIndividualData = () => {
    let filteredData = testData;
    
    // Apply current filters to get available options
    if (filters.sex && filters.sex !== "all" && filters.sex !== "") {
      filteredData = filteredData.filter(d => d.gender === filters.sex);
    }
    
    if (filters.testName && filters.testName !== "all" && filters.testName !== "") {
      filteredData = filteredData.filter(d => d.test_name === filters.testName);
    }
    
    if (filters.athleteName.length > 0) {
      filteredData = filteredData.filter(d => filters.athleteName.includes(d.athlete_name));
    }
    
    // Extract unique values from filtered data
    const availableAthletes = [...new Set(filteredData.map(d => d.athlete_name))];
    const availableTests = [...new Set(filteredData.map(d => d.test_name))];
    const availableSexOptions = [...new Set(filteredData.map(d => d.gender).filter(Boolean))];
    
    return {
      athletes: availableAthletes,
      tests: availableTests,
      sexOptions: availableSexOptions
    };
  };

  // Create dependent dropdown options for Region Filters
  const getFilteredRegionData = () => {
    // Start with all region data
    let availableCountries = regionData.countries;
    let availableRegions = regionData.regions;
    let availableAddresses = regionData.addresses;
    let availableTeamNames = regionData.teamNames;
    
    // If countries are selected, filter other fields accordingly
    if (filters.country.length > 0) {
      // This would need actual relationship data from regionTestingData
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

  // Get available metric types based on selected test name
  const availableMetricTypes = filters.testName && filters.testName !== "all" 
    ? getMetricTypesForTest(filters.testName) 
    : [];

  // Handle cascading filter changes
  const handleSexChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      sex: value,
      athleteName: [], // Reset dependent filters
      testName: "",
      metricType: ""
    }));
  };

  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value,
      metricType: "" // Reset metric type when test name changes
    }));
  };

  const handleAthleteNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      athleteName: value
    }));
  };

  // Handle region filter cascading changes
  const handleCountryChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      country: value,
      region: [], // Reset dependent filters
      address: [],
      teamName: []
    }));
  };

  const handleRegionChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      region: value,
      address: [], // Reset dependent filters
      teamName: []
    }));
  };

  const handleAddressChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      address: value,
      teamName: [] // Reset dependent filters
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm mb-4 max-w-full overflow-visible">
      {/* All Filters in One Row */}
      <div className="flex items-end justify-center gap-3 flex-wrap">
        <div className="flex items-end justify-center text-sm font-semibold text-gray-800 min-w-[120px] flex-shrink-0 h-[36px]">
          Individual Filters
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Sex</label>
          <Select value={filters.sex} onValueChange={handleSexChange}>
            <SelectTrigger className="bg-black text-white text-center h-9 text-xs">
              <SelectValue placeholder="Sex" className="text-center" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              <SelectItem value="all" className="text-center text-xs">All</SelectItem>
              {filteredIndividualData.sexOptions.map(sex => (
                <SelectItem key={sex} value={sex} className="text-center text-xs">
                  {sex}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Test Name</label>
          <Select value={filters.testName} onValueChange={handleTestNameChange}>
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
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Athlete Name</label>
          <MultiSelectDropdown
            options={athleteOptions}
            value={filters.athleteName}
            onChange={handleAthleteNameChange}
            placeholder="Select Athletes"
            labelClassName="bg-black text-white text-center h-9 text-xs"
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Metric Type</label>
          <Select 
            value={filters.metricType} 
            onValueChange={value => setFilters(prev => ({ ...prev, metricType: value }))}
            disabled={!filters.testName || filters.testName === "all"}
          >
            <SelectTrigger className={`${!filters.testName || filters.testName === "all" ? "bg-gray-400 text-gray-600" : "bg-black text-white"} text-center h-9 text-xs`}>
              <SelectValue placeholder="Metric Type" className="text-center" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {availableMetricTypes.map(metric => (
                <SelectItem key={metric} value={metric} className="text-center text-xs">
                  {metric}
                </SelectItem>
              ))}
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
            onChange={handleCountryChange}
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
            onChange={handleRegionChange}
            placeholder="Select Regions"
            labelClassName={`${filters.country.length === 0 ? "bg-gray-400 text-gray-600" : "bg-black text-white"} text-center h-9 text-xs`}
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
        <div className="w-36 flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1 text-center h-[15px]">Address</label>
          <MultiSelectDropdown
            options={addressOptions}
            value={filters.address}
            onChange={handleAddressChange}
            placeholder="Select Addresses"
            labelClassName={`${filters.region.length === 0 ? "bg-gray-400 text-gray-600" : "bg-black text-white"} text-center h-9 text-xs`}
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
            labelClassName={`${filters.address.length === 0 ? "bg-gray-400 text-gray-600" : "bg-black text-white"} text-center h-9 text-xs`}
            dropdownClassName="bg-white border border-gray-200 z-[100]"
          />
        </div>
      </div>
    </div>
  );
};
