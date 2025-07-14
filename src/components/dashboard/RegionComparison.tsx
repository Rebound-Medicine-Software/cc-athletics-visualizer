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
  selectedTeams?: string[];
}

export const RegionComparison = ({ data, resetFiltersKey, selectedTeams = [] }: RegionComparisonProps) => {
  const { data: regionTestingData, isLoading: regionDataLoading } = useRegionData();
  
  const [filters, setFilters] = useState({
    athleteName: [] as string[],
    sex: "",
    testName: "",
    metricType: "",
    country: [] as string[],
    region: [] as string[],
    address: [] as string[],
    teamName: [] as string[]
  });

  // Reset all filters when key changes
  useEffect(() => {
    setFilters({
      athleteName: [],
      sex: "",
      testName: "",
      metricType: "",
      country: [],
      region: [],
      address: [],
      teamName: []
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
    
    let filteredRegionData = regionTestingData;
    
    // Apply country filter
    if (filters.country.length > 0) {
      filteredRegionData = filteredRegionData.filter(item => 
        filters.country.includes(item.country)
      );
    }
    
    // Apply region filter
    if (filters.region.length > 0) {
      filteredRegionData = filteredRegionData.filter(item => 
        item.region && filters.region.includes(item.region)
      );
    }
    
    // Apply address filter
    if (filters.address.length > 0) {
      filteredRegionData = filteredRegionData.filter(item => 
        item.address && filters.address.includes(item.address)
      );
    }
    
    return {
      countries: [...new Set(regionTestingData.map(item => item.country).filter(Boolean))],
      regions: filters.country.length > 0 
        ? [...new Set(filteredRegionData.map(item => item.region).filter(Boolean))]
        : [...new Set(regionTestingData.map(item => item.region).filter(Boolean))],
      addresses: filters.region.length > 0 
        ? [...new Set(filteredRegionData.map(item => item.address).filter(Boolean))]
        : [...new Set(regionTestingData.map(item => item.address).filter(Boolean))],
      teamNames: filters.address.length > 0 
        ? [...new Set(filteredRegionData.map(item => item["Team Name"]).filter(Boolean))]
        : [...new Set(regionTestingData.map(item => item["Team Name"]).filter(Boolean))]
    };
  };

  const dependentRegionData = getFilteredRegionData();

  // Only include teams matching selectedTeams/global filter
  const filteredByTeam = selectedTeams.length > 0
    ? data.filter(d => selectedTeams.includes(d.team_name))
    : data;

  // TABLE DATA: Apply ONLY individual filters for the leaderboard table
  let tableFilteredData = filteredByTeam;
  
  if (filters.athleteName.length > 0) {
    tableFilteredData = tableFilteredData.filter(d => filters.athleteName.includes(d.athlete_name));
  }
  
  if (filters.sex && filters.sex !== "all") {
    tableFilteredData = tableFilteredData.filter(d => d.gender === filters.sex);
  }
  
  if (filters.testName && filters.testName !== "all") {
    tableFilteredData = tableFilteredData.filter(d => d.test_name === filters.testName);
  }

  // MAP DATA: Apply ONLY region filters for the map display - NO INDIVIDUAL FILTERS
  // Start with team-filtered data, then apply ONLY region-based team filtering
  let mapFilteredData = filteredByTeam;
  
  // Only filter by team names that are selected in the Region Filters (not Individual Filters)
  if (filters.teamName.length > 0) {
    mapFilteredData = mapFilteredData.filter(d => filters.teamName.includes(d.team_name));
  }
  // Do NOT apply individual filters (athleteName, sex, testName) to map data

  // Build table data with proper metric extraction (based on individual filters only)
  const tableData = tableFilteredData
    .map((test, index) => {
      let metricValue = 0;
      let metricType = filters.metricType || "Peak Force";
      
      // Extract metric value based on selected metric type and test name
      if (filters.metricType && test.metrics) {
        const metrics = test.metrics as any;
        
        switch (filters.metricType) {
          case "Jump Height (cm)":
          case "Jump Height (Pogo)":
            metricValue = metrics.jump_height_ft ? metrics.jump_height_ft * 30.48 : 
                         metrics.jump_height || metrics.avg_jump_height || 0;
            break;
          case "Peak Power":
            metricValue = metrics.peak_power || 0;
            break;
          case "Relative Peak Power":
            const peakPower = metrics.peak_power || 0;
            const bodyMass = metrics.body_mass || 0;
            metricValue = bodyMass > 0 ? peakPower / bodyMass : 0;
            break;
          case "Contact Time":
            metricValue = metrics.contact_time || metrics.avg_contact_time || 0;
            break;
          case "Reactive Strength Index":
            metricValue = metrics.rsi || metrics.avg_rsi || 0;
            break;
          case "Flight Time":
            metricValue = metrics.flight_time || metrics.avg_flight_time || 0;
            break;
          case "Take-off Velocity":
            metricValue = metrics.takeoff_velocity || metrics.peak_velocity || 0;
            break;
          case "Average Rate of Force Development":
            metricValue = metrics.avg_rfd || metrics.rfd_max || 0;
            break;
          case "Average Propulsive Power":
            metricValue = metrics.avg_propulsive_power || metrics.avg_power || 0;
            break;
          case "Power":
            metricValue = metrics.power || metrics.avg_power || 0;
            break;
          case "Maximum Rate of Force Development":
            metricValue = metrics.rfd_max || metrics.avg_rfd || 0;
            break;
          case "Force at Max Rate of Force Development":
            metricValue = metrics.force_150ms || metrics.force_100ms || metrics.force_50ms || metrics.force_peak || 0;
            break;
          case "Peak Force":
            metricValue = metrics.peak_force || metrics.force_peak || 0;
            break;
          case "Early Explosive Power":
            metricValue = metrics.force_50ms || 0;
            break;
          default:
            metricValue = metrics.peak_force || metrics.force_peak || 0;
        }
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
  const getFilteredIndividualData = () => {
    let currentData = filteredByTeam;
    
    // Apply current individual filters to get available options
    if (filters.sex && filters.sex !== "all") {
      currentData = currentData.filter(d => d.gender === filters.sex);
    }
    if (filters.testName && filters.testName !== "all") {
      currentData = currentData.filter(d => d.test_name === filters.testName);
    }
    if (filters.athleteName.length > 0) {
      currentData = currentData.filter(d => filters.athleteName.includes(d.athlete_name));
    }
    
    return {
      availableAthletes: [...new Set(currentData.map(d => d.athlete_name))],
      availableTests: [...new Set(currentData.map(d => d.test_name))],
      availableTeams: [...new Set(currentData.map(d => d.team_name))]
    };
  };

  const individualFilterData = getFilteredIndividualData();
  const uniqueAthletes = individualFilterData.availableAthletes;
  const uniqueTests = individualFilterData.availableTests;
  const uniqueTeams = individualFilterData.availableTeams;

  return (
    <Card className="bg-gray-100 border-gray-300">
      <CardHeader>
        <Filters
          filters={filters}
          setFilters={setFilters}
          uniqueAthletes={uniqueAthletes}
          uniqueTests={uniqueTests}
          uniqueTeams={uniqueTeams}
          regionData={dependentRegionData}
          testData={filteredByTeam}
        />
        {/* Header in rounded box */}
        <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm">
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
            teamName: filters.teamName
          }}
          individualFilters={{
            athleteName: filters.athleteName,
            sex: filters.sex,
            testName: filters.testName,
            metricType: filters.metricType
          }}
          data={mapFilteredData}
          regionData={dependentRegionData}
        />
      </CardContent>
    </Card>
  );
};
