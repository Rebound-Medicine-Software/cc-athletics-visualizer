
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { RefreshCcw } from "lucide-react";

interface FiltersProps {
  filters: {
    teamName: string[]; // Individual filter
    sex: string; // Individual filter
    athleteName: string[]; // Individual filter
    testName: string; // Individual filter
    country: string[]; // Region filter
    region: string[]; // Region filter
    address: string[]; // Region filter
    metricType: string; // Region filter
  };
  setFilters: React.Dispatch<
    React.SetStateAction<{
      teamName: string[];
      sex: string;
      athleteName: string[];
      testName: string;
      country: string[];
      region: string[];
      address: string[];
      metricType: string;
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
    if (filters.teamName.length > 0) {
      filteredData = filteredData.filter(d => filters.teamName.includes(d.team_name));
    }
    
    if (filters.sex && filters.sex !== "all") {
      filteredData = filteredData.filter(d => d.gender === filters.sex);
    }
    
    if (filters.athleteName.length > 0) {
      filteredData = filteredData.filter(d => filters.athleteName.includes(d.athlete_name));
    }
    
    if (filters.testName && filters.testName !== "all") {
      filteredData = filteredData.filter(d => d.test_name === filters.testName);
    }
    
    // Extract unique values from filtered data
    const availableTeams = [...new Set(filteredData.map(d => d.team_name))];
    const availableAthletes = [...new Set(filteredData.map(d => d.athlete_name))];
    const availableTests = [...new Set(filteredData.map(d => d.test_name))];
    const availableSexOptions = [...new Set(filteredData.map(d => d.gender).filter(Boolean))];
    
    return {
      teams: availableTeams,
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
  const teamOptions = filteredIndividualData.teams.map(team => ({ value: team, label: team }));
  const athleteOptions = filteredIndividualData.athletes.map(athlete => ({ value: athlete, label: athlete }));
  
  const filteredRegionData = getFilteredRegionData();
  const countryOptions = filteredRegionData.countries.map(country => ({ value: country, label: country }));
  const regionOptions = filteredRegionData.regions.map(region => ({ value: region, label: region }));
  const addressOptions = filteredRegionData.addresses.map(address => ({ value: address, label: address }));

  // Get available metric types - available for all tests, not dependent on test selection for region filtering
  const availableMetricTypes = [
    "Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time",
    "Peak Power", "Relative Peak Power", "Take-off Velocity", 
    "Average Rate of Force Development", "Average Propulsive Power",
    "Jump Height (Pogo)", "Power", "Maximum Rate of Force Development", 
    "Force at Max Rate of Force Development", "Peak Force", "Early Explosive Power"
  ];

  // Individual Filters: Team Name (always enabled) > Sex > Athlete Name > Test Name
  const sexEnabled = filters.teamName.length > 0;
  const athleteEnabled = filters.sex && filters.sex !== "all";
  const testNameEnabled = filters.athleteName.length > 0;

  // Region Filters: Country (always enabled) > Region > Address > Metric Type
  const regionEnabled = filters.country.length > 0;
  const addressEnabled = filters.region.length > 0;
  const metricTypeEnabled = filters.address.length > 0;

  // Handle cascading filter changes for Individual Filters
  const handleTeamNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      teamName: value,
      // Reset dependent filters when team changes
      sex: value.length === 0 ? "all" : prev.sex,
      athleteName: value.length === 0 ? [] : prev.athleteName,
      testName: value.length === 0 ? "all" : prev.testName
    }));
  };

  const handleSexChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      sex: value,
      // Reset dependent filters when sex changes
      athleteName: value === "all" ? [] : prev.athleteName,
      testName: value === "all" ? "all" : prev.testName
    }));
  };

  const handleAthleteNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      athleteName: value,
      // Reset dependent filters when athlete changes
      testName: value.length === 0 ? "all" : prev.testName
    }));
  };

  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value
    }));
  };

  // Handle region filter cascading changes
  const handleCountryChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      country: value,
      // Reset dependent filters when country changes
      region: value.length === 0 ? [] : prev.region,
      address: value.length === 0 ? [] : prev.address,
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  const handleRegionChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      region: value,
      // Reset dependent filters when region changes
      address: value.length === 0 ? [] : prev.address,
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  const handleAddressChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      address: value,
      // Reset metric type when address changes
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  // Reset handlers for Individual Filters
  const handleResetTeamName = () => {
    setFilters(prev => ({
      ...prev,
      teamName: [],
      sex: "all",
      athleteName: [],
      testName: "all"
    }));
  };

  const handleResetSex = () => {
    setFilters(prev => ({
      ...prev,
      sex: "all",
      athleteName: [],
      testName: "all"
    }));
  };

  const handleResetAthleteName = () => {
    setFilters(prev => ({
      ...prev,
      athleteName: [],
      testName: "all"
    }));
  };

  const handleResetTestName = () => {
    setFilters(prev => ({
      ...prev,
      testName: "all"
    }));
  };

  // Reset handlers for Region Filters
  const handleResetCountry = () => {
    setFilters(prev => ({
      ...prev,
      country: [],
      region: [],
      address: [],
      metricType: "all"
    }));
  };

  const handleResetRegion = () => {
    setFilters(prev => ({
      ...prev,
      region: [],
      address: [],
      metricType: "all"
    }));
  };

  const handleResetAddress = () => {
    setFilters(prev => ({
      ...prev,
      address: [],
      metricType: "all"
    }));
  };

  const handleResetMetricType = () => {
    setFilters(prev => ({
      ...prev,
      metricType: "all"
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm mb-4 max-w-full overflow-visible">
      {/* Individual Filters Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 text-center">Individual Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 justify-items-center items-center min-h-[120px] content-center">
          {/* Team Name */}
          <div className="w-[250px] min-w-[250px] max-w-[250px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Team Name</label>
            <div className="flex items-center gap-2">
              <MultiSelectDropdown
                options={teamOptions}
                value={filters.teamName}
                onChange={handleTeamNameChange}
                placeholder="All Teams"
                className="text-center h-10 min-h-[40px] max-h-[40px]"
                labelClassName="bg-white h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none"
                dropdownClassName="w-[600px] z-[100]"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Team Name"
                className="p-2"
                onClick={handleResetTeamName}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Sex */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Sex</label>
            <div className="flex items-center gap-2">
              <div className={sexEnabled ? "" : "pointer-events-none"}>
                <Select value={filters.sex} onValueChange={sexEnabled ? handleSexChange : () => {}}>
                  <SelectTrigger className={`${sexEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden`}>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all" className="text-center">All</SelectItem>
                    {filteredIndividualData.sexOptions.map(sex => (
                      <SelectItem key={sex} value={sex} className="text-center">
                        {sex}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Sex"
                className={`p-2 ${!sexEnabled ? "pointer-events-none opacity-50" : ""}`}
                onClick={sexEnabled ? handleResetSex : undefined}
                type="button"
                disabled={!sexEnabled}
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Athlete Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Athlete Name</label>
            <div className="flex items-center gap-2">
              <div className={athleteEnabled ? "" : "pointer-events-none"}>
                <MultiSelectDropdown
                  options={athleteOptions}
                  value={filters.athleteName}
                  onChange={athleteEnabled ? handleAthleteNameChange : () => {}}
                  placeholder="All Athletes"
                  className={`text-center h-10 min-h-[40px] max-h-[40px] ${!athleteEnabled ? "bg-black opacity-60 text-gray-300" : "bg-white"}`}
                  labelClassName={`${athleteEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none`}
                  dropdownClassName="w-[600px] z-[100]"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Athlete Name"
                className={`p-2 ${!athleteEnabled ? "pointer-events-none opacity-50" : ""}`}
                onClick={athleteEnabled ? handleResetAthleteName : undefined}
                type="button"
                disabled={!athleteEnabled}
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Test Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Name</label>
            <div className="flex items-center gap-2">
              <div className={testNameEnabled ? "" : "pointer-events-none"}>
                <Select value={filters.testName} onValueChange={testNameEnabled ? handleTestNameChange : () => {}}>
                  <SelectTrigger className={`${testNameEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden`}>
                    <SelectValue placeholder="All Tests" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all" className="text-center">All Tests</SelectItem>
                    {filteredIndividualData.tests.map(test => (
                      <SelectItem key={test} value={test} className="text-center">
                        {test}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Test Name"
                className={`p-2 ${!testNameEnabled ? "pointer-events-none opacity-50" : ""}`}
                onClick={testNameEnabled ? handleResetTestName : undefined}
                type="button"
                disabled={!testNameEnabled}
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Region Filters Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 text-center">Region Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 justify-items-center items-center min-h-[120px] content-center">
          {/* Country */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Country</label>
            <div className="flex items-center gap-2">
              <MultiSelectDropdown
                options={countryOptions}
                value={filters.country}
                onChange={handleCountryChange}
                placeholder="All Countries"
                className="text-center h-10 min-h-[40px] max-h-[40px]"
                labelClassName="bg-white h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none"
                dropdownClassName="w-[600px] z-[100]"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Country"
                className="p-2"
                onClick={handleResetCountry}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Region */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Region</label>
            <div className="flex items-center gap-2">
              <div className={regionEnabled ? "" : "pointer-events-none"}>
                <MultiSelectDropdown
                  options={regionOptions}
                  value={filters.region}
                  onChange={regionEnabled ? handleRegionChange : () => {}}
                  placeholder="All Regions"
                  className={`text-center h-10 min-h-[40px] max-h-[40px] ${!regionEnabled ? "bg-black opacity-60 text-gray-300" : "bg-white"}`}
                  labelClassName={`${regionEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none`}
                  dropdownClassName="w-[600px] z-[100]"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Region"
                className={`p-2 ${!regionEnabled ? "pointer-events-none opacity-50" : ""}`}
                onClick={regionEnabled ? handleResetRegion : undefined}
                type="button"
                disabled={!regionEnabled}
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Address */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Address</label>
            <div className="flex items-center gap-2">
              <div className={addressEnabled ? "" : "pointer-events-none"}>
                <MultiSelectDropdown
                  options={addressOptions}
                  value={filters.address}
                  onChange={addressEnabled ? handleAddressChange : () => {}}
                  placeholder="All Addresses"
                  className={`text-center h-10 min-h-[40px] max-h-[40px] ${!addressEnabled ? "bg-black opacity-60 text-gray-300" : "bg-white"}`}
                  labelClassName={`${addressEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none`}
                  dropdownClassName="w-[600px] z-[100]"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Address"
                className={`p-2 ${!addressEnabled ? "pointer-events-none opacity-50" : ""}`}
                onClick={addressEnabled ? handleResetAddress : undefined}
                type="button"
                disabled={!addressEnabled}
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Metric Type */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Metric Type</label>
            <div className="flex items-center gap-2">
              <div className={metricTypeEnabled ? "" : "pointer-events-none"}>
                <Select 
                  value={filters.metricType} 
                  onValueChange={metricTypeEnabled ? (value => setFilters(prev => ({ ...prev, metricType: value }))) : () => {}}
                >
                  <SelectTrigger className={`${metricTypeEnabled ? "bg-white" : "bg-black opacity-60 text-gray-300"} text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden`}>
                    <SelectValue placeholder="All Metrics" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all" className="text-center">All Metrics</SelectItem>
                    {availableMetricTypes.map(metric => (
                      <SelectItem key={metric} value={metric} className="text-center">
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Metric Type"
                className={`p-2 ${!metricTypeEnabled ? "pointer-events-none opacity-50" : ""}`}
                onClick={metricTypeEnabled ? handleResetMetricType : undefined}
                type="button"
                disabled={!metricTypeEnabled}
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
