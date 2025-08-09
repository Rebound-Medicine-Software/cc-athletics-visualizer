
import React from "react";
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
    
    // Apply filters for Team options (no dependencies)
    const teamFilteredData = testData;
    
    // Apply filters for Sex options (depends on team selection)
    let sexFilteredData = testData;
    if (filters.teamName.length > 0) {
      sexFilteredData = sexFilteredData.filter(d => filters.teamName.includes(d.team_name));
    }
    
    // Apply filters for Athlete options (depends on team + sex, but NOT current athlete selection)
    let athleteFilteredData = testData;
    if (filters.teamName.length > 0) {
      athleteFilteredData = athleteFilteredData.filter(d => filters.teamName.includes(d.team_name));
    }
    if (filters.sex && filters.sex !== "all") {
      athleteFilteredData = athleteFilteredData.filter(d => d.gender === filters.sex);
    }
    // DO NOT filter by current athleteName selection - this causes the circular issue
    
    // Apply filters for Test options (depends on team + sex + athletes, but NOT current test selection)
    let testFilteredData = testData;
    if (filters.teamName.length > 0) {
      testFilteredData = testFilteredData.filter(d => filters.teamName.includes(d.team_name));
    }
    if (filters.sex && filters.sex !== "all") {
      testFilteredData = testFilteredData.filter(d => d.gender === filters.sex);
    }
    if (filters.athleteName.length > 0) {
      testFilteredData = testFilteredData.filter(d => filters.athleteName.includes(d.athlete_name));
    }
    // DO NOT filter by current testName selection
    
    // Extract unique values from appropriate filtered data
    const availableTeams = [...new Set(teamFilteredData.map(d => d.team_name))];
    const availableAthletes = [...new Set(athleteFilteredData.map(d => d.athlete_name))];
    const availableTests = [...new Set(testFilteredData.map(d => d.test_name))];
    const availableSexOptions = [...new Set(sexFilteredData.map(d => d.gender).filter(Boolean))];
    
    return {
      teams: availableTeams,
      athletes: availableAthletes,
      tests: availableTests,
      sexOptions: availableSexOptions
    };
  };

  // Create dependent dropdown options for Region Filters
  const getFilteredRegionData = () => {
    // For region filters, we don't have the same detailed relationship data as individual filters
    // So we'll use the available regionData arrays directly to avoid circular filtering issues
    return {
      countries: regionData.countries,
      regions: regionData.regions, 
      addresses: regionData.addresses,
      teamNames: regionData.teamNames
    };
  };

  // Use React.useMemo to stabilize option arrays and prevent unnecessary re-renders
  const filteredIndividualData = React.useMemo(() => getFilteredIndividualData(), [testData, filters.teamName, filters.sex]);
  const teamOptions = React.useMemo(() => 
    filteredIndividualData.teams.map(team => ({ value: team, label: team })), 
    [filteredIndividualData.teams]
  );
  const athleteOptions = React.useMemo(() => 
    filteredIndividualData.athletes.map(athlete => ({ value: athlete, label: athlete })), 
    [filteredIndividualData.athletes]
  );
  
  const filteredRegionData = React.useMemo(() => getFilteredRegionData(), [regionData]);
  const countryOptions = React.useMemo(() => 
    filteredRegionData.countries.map(country => ({ value: country, label: country })), 
    [filteredRegionData.countries]
  );
  const regionOptions = React.useMemo(() => 
    filteredRegionData.regions.map(region => ({ value: region, label: region })), 
    [filteredRegionData.regions]
  );
  const addressOptions = React.useMemo(() => 
    filteredRegionData.addresses.map(address => ({ value: address, label: address })), 
    [filteredRegionData.addresses]
  );

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
  // Apply blackout logic: enable next only when previous has selection
  const regionEnabled = filters.country.length > 0;
  const addressEnabled = filters.region.length > 0;
  const metricTypeEnabled = filters.address.length > 0;

  // Handle cascading filter changes for Individual Filters
  const handleTeamNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      teamName: value,
      // Only reset dependent filters when team is completely cleared
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
      address: value
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
    <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm mb-4 max-w-full">
      {/* Individual Filters Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 text-center">Individual Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 justify-items-center items-center min-h-[120px] content-center">
          {/* Team Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Team Name</label>
            <MultiSelectDropdown
              options={teamOptions}
              value={filters.teamName}
              onChange={handleTeamNameChange}
              placeholder="Select Teams"
              className="bg-white"
              labelClassName="bg-white"
            />
          </div>

          {/* Sex */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Sex</label>
            <div className={sexEnabled ? "" : "pointer-events-none"}>
              {!sexEnabled ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Select Sex
                </div>
              ) : (
                <Select value={filters.sex} onValueChange={handleSexChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Sex" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="all">All</SelectItem>
                    {filteredIndividualData.sexOptions.map(sex => (
                      <SelectItem key={sex} value={sex}>
                        {sex.charAt(0).toUpperCase() + sex.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Athlete Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Athlete Name(s)</label>
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

          {/* Test Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Name</label>
            <div className={testNameEnabled ? "" : "pointer-events-none"}>
              {!testNameEnabled ? (
                <div className="bg-gray-100 opacity-60 h-10 rounded-md border border-input px-3 py-2 text-sm text-muted-foreground flex items-center">
                  Select Test
                </div>
              ) : (
                <Select value={filters.testName} onValueChange={handleTestNameChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Test" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="all">All Tests</SelectItem>
                    {filteredIndividualData.tests.map(test => (
                      <SelectItem key={test} value={test}>
                        {test}
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

          {/* Address */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Address</label>
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
                dropdownClassName="z-[60]"
              />
            )}
          </div>

          {/* Metric Type */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Metric Type</label>
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
  );
};
