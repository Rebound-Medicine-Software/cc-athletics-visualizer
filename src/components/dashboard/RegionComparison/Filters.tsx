
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
    testDate: string; // Individual filter
    individualMetricType: string; // Individual filter
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
      testDate: string;
      individualMetricType: string;
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
    const availableTestDates = [...new Set(filteredData.map(d => d.test_date))].sort();
    
    return {
      teams: availableTeams,
      athletes: availableAthletes,
      tests: availableTests,
      sexOptions: availableSexOptions,
      testDates: availableTestDates
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

  // Individual Filters: Test Name (always enabled) > Athlete Name > Test Date > Metric Type
  const athleteEnabled = filters.testName && filters.testName !== "all";
  const testDateEnabled = filters.athleteName.length > 0;
  const metricTypeForIndividualEnabled = filters.testDate && filters.testDate !== "";

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
      // Only reset dependent filters when country is completely cleared
      region: value.length === 0 ? [] : prev.region,
      address: value.length === 0 ? [] : prev.address,
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  const handleRegionChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      region: value,
      // Only reset dependent filters when region is completely cleared
      address: value.length === 0 ? [] : prev.address,
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  const handleAddressChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      address: value,
      // Only reset metric type when address is completely cleared
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
          {/* Test Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Name</label>
            <Select value={filters.testName} onValueChange={handleTestNameChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select Test Name" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {filteredIndividualData.tests.map(test => (
                  <SelectItem key={test} value={test}>
                    {test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Athlete Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Athlete Name</label>
            <div className={athleteEnabled ? "" : "pointer-events-none"}>
              {!athleteEnabled ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Select Athletes
                </div>
              ) : (
                <MultiSelectDropdown
                  options={athleteOptions}
                  value={filters.athleteName}
                  onChange={handleAthleteNameChange}
                  placeholder="Select Athletes"
                  className="bg-white"
                  labelClassName="bg-white"
                />
              )}
            </div>
          </div>

          {/* Test Date */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Date</label>
            <div className={testDateEnabled ? "" : "pointer-events-none"}>
              {!testDateEnabled ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Select Date
                </div>
              ) : (
                <Select value={filters.testDate || ""} onValueChange={(val) => setFilters(prev => ({ ...prev, testDate: val }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Date" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {filteredIndividualData.testDates?.map(date => (
                      <SelectItem key={date} value={date}>
                        {date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Metric Type */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Metric Type</label>
            <div className={metricTypeForIndividualEnabled ? "" : "pointer-events-none"}>
              {!metricTypeForIndividualEnabled ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Select Metric
                </div>
              ) : (
                <Select value={filters.individualMetricType || ""} onValueChange={(val) => setFilters(prev => ({ ...prev, individualMetricType: val }))}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Metric" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {getMetricTypesForTest(filters.testName).map(metric => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            <MultiSelectDropdown
              options={countryOptions}
              value={filters.country}
              onChange={handleCountryChange}
              placeholder="Select Countries"
              className="bg-white"
              labelClassName="bg-white"
            />
          </div>

          {/* Region */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Region</label>
            <div className={regionEnabled ? "" : "pointer-events-none"}>
               {!regionEnabled ? (
                 <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                   Select Regions
                 </div>
               ) : (
                 <MultiSelectDropdown
                   options={regionOptions}
                   value={filters.region}
                   onChange={handleRegionChange}
                   placeholder="Select Regions"
                   className="bg-white"
                   labelClassName="bg-white"
                 />
               )}
            </div>
          </div>

          {/* Address */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Address</label>
            <div className={addressEnabled ? "" : "pointer-events-none"}>
               {!addressEnabled ? (
                 <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                   Select Addresses
                 </div>
               ) : (
                 <MultiSelectDropdown
                   options={addressOptions}
                   value={filters.address}
                   onChange={handleAddressChange}
                   placeholder="Select Addresses"
                   className="bg-white"
                   labelClassName="bg-white"
                 />
               )}
            </div>
          </div>

          {/* Metric Type */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Metric Type</label>
            <div className={metricTypeEnabled ? "" : "pointer-events-none"}>
              {!metricTypeEnabled ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Select Metric
                </div>
              ) : (
                <Select 
                  value={filters.metricType} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, metricType: value }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Metric" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="all">All Metrics</SelectItem>
                    {availableMetricTypes.map(metric => (
                      <SelectItem key={metric} value={metric}>
                        {metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
