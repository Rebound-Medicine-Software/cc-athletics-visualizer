
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TestData } from "@/types/forcePlateTypes";
import { useState, useEffect } from "react";
import { Filters } from "./RegionComparison/Filters";
import { DataTable } from "./RegionComparison/DataTable";
import { SatelliteMap } from "../SatelliteMap";
import { useRegionData } from "@/hooks/useRegionData";

interface RegionComparisonProps {
  data: TestData[];
  resetFiltersKey?: number;
  selectedTeams?: string[]; // Not used - Region Comparison operates independently
  branding?: any;
}

export const RegionComparison = ({ data, resetFiltersKey, branding }: RegionComparisonProps) => {
  const { data: regionTestingData, isLoading: regionDataLoading } = useRegionData();
  
  const [filters, setFilters] = useState({
    // Individual Filters - teamName and athleteName are arrays, sex and testName are strings
    teamName: [] as string[],
    sex: "all",
    athleteName: [] as string[],
    testName: "all",
    // Region Filters - country, region, address are arrays, metricType is string
    country: [] as string[],
    region: [] as string[],
    address: [] as string[],
    metricType: "all"
  });

  // Reset all filters when key changes
  useEffect(() => {
    setFilters({
      // Individual Filters
      teamName: [],
      sex: "all",
      athleteName: [],
      testName: "all",
      // Region Filters
      country: [],
      region: [],
      address: [],
      metricType: "all"
    });
  }, [resetFiltersKey]);

  // Process region data for dependent dropdowns
  const regionData = {
    countries: regionTestingData ? [...new Set(regionTestingData.map(item => item.country).filter(Boolean))] : [],
    regions: regionTestingData ? [...new Set(regionTestingData.map(item => item.region).filter(Boolean))] : [],
    addresses: regionTestingData ? [...new Set(regionTestingData.map(item => item.address).filter(Boolean))] : [],
    teamNames: regionTestingData ? [...new Set(regionTestingData.map(item => item["Team Name"]).filter(Boolean))] : []
  };

  // Create dependent region filtering
  const getFilteredRegionData = () => {
    if (!regionTestingData) return regionData;
    
    // Each dropdown only depends on filters ABOVE it in the cascade
    // Country -> Region -> Address -> Team
    
    // Regions: filtered by country only
    let countryFiltered = regionTestingData;
    if (filters.country.length > 0) {
      countryFiltered = countryFiltered.filter(item => filters.country.includes(item.country));
    }
    
    // Addresses: filtered by country + region
    let regionFiltered = countryFiltered;
    if (filters.region.length > 0) {
      regionFiltered = regionFiltered.filter(item => item.region && filters.region.includes(item.region));
    }
    
    // Teams: filtered by country + region + address
    let addressFiltered = regionFiltered;
    if (filters.address.length > 0) {
      addressFiltered = addressFiltered.filter(item => item.address && filters.address.includes(item.address));
    }
    
    return {
      countries: [...new Set(regionTestingData.map(item => item.country).filter(Boolean))],
      regions: filters.country.length > 0 
        ? [...new Set(countryFiltered.map(item => item.region).filter(Boolean))]
        : [...new Set(regionTestingData.map(item => item.region).filter(Boolean))],
      addresses: filters.region.length > 0 
        ? [...new Set(regionFiltered.map(item => item.address).filter(Boolean))]
        : [...new Set(regionTestingData.map(item => item.address).filter(Boolean))],
      teamNames: filters.address.length > 0 
        ? [...new Set(addressFiltered.map(item => item["Team Name"]).filter(Boolean))]
        : [...new Set(regionTestingData.map(item => item["Team Name"]).filter(Boolean))]
    };
  };

  const dependentRegionData = getFilteredRegionData();

  // TABLE DATA: Apply ONLY individual filters for the leaderboard table
  // NO selectedTeams filter - this section operates independently
  let tableFilteredData = data;
  
  // Apply Individual Filters
  if (filters.teamName.length > 0) {
    tableFilteredData = tableFilteredData.filter(d => filters.teamName.includes(d.team_name));
  }
  
  if (filters.sex && filters.sex !== "all") {
    tableFilteredData = tableFilteredData.filter(d => d.gender === filters.sex);
  }
  
  if (filters.athleteName.length > 0) {
    tableFilteredData = tableFilteredData.filter(d => filters.athleteName.includes(d.athlete_name));
  }
  
  if (filters.testName && filters.testName !== "all") {
    tableFilteredData = tableFilteredData.filter(d => d.test_name === filters.testName);
  }

  // MAP DATA: Apply ONLY region filters for the map display
  // NO selectedTeams filter - this section operates independently
  let mapFilteredData = data;
  
  // Filter map data based on region filtering - use regionTestingData to get teams from region filters
  if (regionTestingData && (filters.country.length > 0 || filters.region.length > 0 || filters.address.length > 0)) {
    let regionFilteredTeams = regionTestingData;
    
    if (filters.country.length > 0) {
      regionFilteredTeams = regionFilteredTeams.filter(item => filters.country.includes(item.country));
    }
    
    if (filters.region.length > 0) {
      regionFilteredTeams = regionFilteredTeams.filter(item => item.region && filters.region.includes(item.region));
    }
    
    if (filters.address.length > 0) {
      regionFilteredTeams = regionFilteredTeams.filter(item => item.address && filters.address.includes(item.address));
    }
    
    const regionTeamNames = [...new Set(regionFilteredTeams.map(item => item["Team Name"]))];
    mapFilteredData = mapFilteredData.filter(d => regionTeamNames.includes(d.team_name));
  }

  // Build table data with proper metric extraction (based on individual filters only)
  const tableData = tableFilteredData
    .map((test, index) => {
      let metricValue = 0;
      let metricType = "Peak Force"; // Default metric for table display
      
      // For table, use a default metric or the selected region metric type if available
      if (filters.metricType && filters.metricType !== "all" && test.metrics) {
        const metrics = test.metrics as any;
        
        switch (filters.metricType) {
          case "Jump Height (cm)":
          case "Jump Height (Pogo)":
            metricValue = metrics.jump_height_ft ? metrics.jump_height_ft * 30.48 : 
                         metrics.jump_height || metrics.avg_jump_height || 0;
            metricType = filters.metricType;
            break;
          case "Peak Power":
            metricValue = metrics.peak_power || 0;
            metricType = filters.metricType;
            break;
          case "Relative Peak Power":
            const peakPower = metrics.peak_power || 0;
            const bodyMass = metrics.body_mass || 0;
            metricValue = bodyMass > 0 ? peakPower / bodyMass : 0;
            metricType = filters.metricType;
            break;
          case "Contact Time":
            metricValue = metrics.contact_time || metrics.avg_contact_time || 0;
            metricType = filters.metricType;
            break;
          case "Reactive Strength Index":
            metricValue = metrics.rsi || metrics.avg_rsi || 0;
            metricType = filters.metricType;
            break;
          case "Flight Time":
            metricValue = metrics.flight_time || metrics.avg_flight_time || 0;
            metricType = filters.metricType;
            break;
          case "Take-off Velocity":
            metricValue = metrics.takeoff_velocity || metrics.peak_velocity || 0;
            metricType = filters.metricType;
            break;
          case "Average Rate of Force Development":
            metricValue = metrics.avg_rfd || metrics.rfd_max || 0;
            metricType = filters.metricType;
            break;
          case "Average Propulsive Power":
            metricValue = metrics.avg_propulsive_power || metrics.avg_power || 0;
            metricType = filters.metricType;
            break;
          case "Power":
            metricValue = metrics.power || metrics.avg_power || 0;
            metricType = filters.metricType;
            break;
          case "Maximum Rate of Force Development":
            metricValue = metrics.rfd_max || metrics.avg_rfd || 0;
            metricType = filters.metricType;
            break;
          case "Force at Max Rate of Force Development":
            metricValue = metrics.force_150ms || metrics.force_100ms || metrics.force_50ms || metrics.force_peak || 0;
            metricType = filters.metricType;
            break;
          case "Peak Force":
            metricValue = metrics.peak_force || metrics.force_peak || 0;
            metricType = filters.metricType;
            break;
          case "Early Explosive Power":
            metricValue = metrics.force_50ms || 0;
            metricType = filters.metricType;
            break;
          default:
            metricValue = metrics.peak_force || metrics.force_peak || 0;
            metricType = "Peak Force";
        }
      } else {
        // Default to Peak Force if no metric type selected
        const metrics = test.metrics as any;
        metricValue = metrics?.peak_force || metrics?.force_peak || 0;
        metricType = "Peak Force";
      }
      
      return {
        id: index + 1,
        teamName: test.team_name ?? "",
        athleteName: test.athlete_name ?? "",
        metricType: metricType,
        metricValue: metricValue,
      };
    })
    .filter(row => row.metricValue > 0)
    .sort((a, b) => (b.metricValue || 0) - (a.metricValue || 0))
    .slice(0, 20);

  // Get filtered options for Individual Filters based on current selections
  // NO selectedTeams filter - this section operates independently
  const getFilteredIndividualData = () => {
    let currentData = data; // Use all data, not filtered by selectedTeams
    
    // Apply current individual filters to get available options
    if (filters.teamName.length > 0) {
      currentData = currentData.filter(d => filters.teamName.includes(d.team_name));
    }
    if (filters.sex && filters.sex !== "all") {
      currentData = currentData.filter(d => d.gender === filters.sex);
    }
    if (filters.athleteName.length > 0) {
      currentData = currentData.filter(d => filters.athleteName.includes(d.athlete_name));
    }
    if (filters.testName && filters.testName !== "all") {
      currentData = currentData.filter(d => d.test_name === filters.testName);
    }
    
    return {
      availableTeams: [...new Set(currentData.map(d => d.team_name))],
      availableAthletes: [...new Set(currentData.map(d => d.athlete_name))],
      availableTests: [...new Set(currentData.map(d => d.test_name))]
    };
  };

  const individualFilterData = getFilteredIndividualData();
  const uniqueTeams = individualFilterData.availableTeams;
  const uniqueAthletes = individualFilterData.availableAthletes;
  const uniqueTests = individualFilterData.availableTests;

  return (
    <div style={branding ? { fontFamily: branding.font_family || 'Inter, system-ui, sans-serif' } : {}}>
      <Card 
        className="border-2"
        style={{
          backgroundColor: branding?.primary_color ? `${branding.primary_color}08` : 'hsl(var(--muted) / 0.5)',
          borderColor: branding?.primary_color ? `${branding.primary_color}30` : 'hsl(var(--border))'
        }}
      >
        <CardHeader>
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueAthletes={uniqueAthletes}
            uniqueTests={uniqueTests}
            uniqueTeams={uniqueTeams}
            regionData={dependentRegionData}
            testData={data} // Pass all data, not filtered by selectedTeams
          />
          {/* Header in rounded box */}
          <div 
            className="rounded-lg border-2 p-4 shadow-sm"
            style={{
              backgroundColor: branding?.secondary_color ? `${branding.secondary_color}15` : 'hsl(var(--card))',
              borderColor: branding?.secondary_color ? `${branding.secondary_color}50` : 'hsl(var(--border))'
            }}
          >
            <CardTitle className="text-center text-lg text-gray-800">
            Comparisons Amongst Regions
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable tableData={tableData} />
        <SatelliteMap 
          regionFilters={{
            country: filters.country,
            region: filters.region,
            address: filters.address,
            metricType: filters.metricType
          }}
          individualFilters={{
            teamName: filters.teamName,
            sex: filters.sex,
            athleteName: filters.athleteName,
            testName: filters.testName
          }}
          data={mapFilteredData}
          regionData={dependentRegionData}
        />
        </CardContent>
      </Card>
    </div>
  );
};
