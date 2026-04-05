import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestData } from "@/types/forcePlateTypes";
import { useState, useEffect, useMemo } from "react";
import { useEliteAthleteData } from "@/hooks/useEliteAthleteData";
import { EliteComparisonFilters } from "./EliteComparison/EliteComparisonFilters";
import { EliteComparisonChart } from "./EliteComparison/EliteComparisonChart";

interface EliteComparisonProps {
  data: TestData[];
  resetFiltersKey?: number;
  selectedTeams?: string[];
  branding?: any;
}

export const EliteComparison = ({ data, resetFiltersKey, branding }: EliteComparisonProps) => {
  const { data: eliteData, isLoading: eliteDataLoading } = useEliteAthleteData();
  
  const [filters, setFilters] = useState({
    // Comparator Filters (Elite Data)
    sport: [] as string[],
    sex: [] as string[], 
    weightCategory: "",
    ageGroup: "",
    // Individual Filters (CC Athletics Data)
    athleteName: [] as string[],
    teamName: [] as string[],
    testName: "",
    metricType: ""
  });

  // Reset all filters when key changes
  useEffect(() => {
    setFilters({
      sport: [],
      sex: [],
      weightCategory: "", 
      ageGroup: "",
      athleteName: [],
      teamName: [],
      testName: "",
      metricType: ""
    });
  }, [resetFiltersKey]);

  // Process elite data for filter options with cascading dependencies
  const eliteFilterOptions = useMemo(() => {
    if (!eliteData) return { sports: [], sexes: [], weightCategories: [], ageGroups: [] };

    // Always show all sports
    const sports = [...new Set(eliteData.map(item => item.Sport).filter(Boolean))];
    
    // Filter by sport for sex options
    const sportFiltered = filters.sport.length > 0
      ? eliteData.filter(item => filters.sport.includes(item.Sport))
      : eliteData;
    const sexes = [...new Set(sportFiltered.map(item => item.Sex).filter(Boolean))];
    
    // Filter by sport + sex for weight categories
    let sexFiltered = sportFiltered;
    if (filters.sex.length > 0 && !filters.sex.includes("all")) {
      sexFiltered = sexFiltered.filter(item => filters.sex.includes(item.Sex));
    }
    const weightCategories = [...new Set(sexFiltered.map(item => item["Weight Category (kg)"]).filter(Boolean))];
    
    // Filter by sport + sex + weight for age groups
    let weightFiltered = sexFiltered;
    if (filters.weightCategory) {
      weightFiltered = weightFiltered.filter(item => item["Weight Category (kg)"] === filters.weightCategory);
    }
    const ageGroups = [...new Set(weightFiltered.map(item => item["Age Group"]).filter(Boolean))].sort((a, b) => a - b);

    return {
      sports,
      sexes,
      weightCategories,
      ageGroups
    };
  }, [eliteData, filters.sport, filters.sex, filters.weightCategory]);

  // Process CC Athletics data for filter options with cascading dependencies
  const individualFilterOptions = useMemo(() => {
    // Always show all team names
    const uniqueTeamNames = [...new Set(data.map(item => item.team_name).filter(Boolean))];
    
    // Filter athletes based on selected teams
    const teamFilteredData = filters.teamName.length > 0
      ? data.filter(item => filters.teamName.includes(item.team_name))
      : data;
    const uniqueAthletes = [...new Set(teamFilteredData.map(item => item.athlete_name).filter(Boolean))];
    
    // Filter test names based on selected teams and athletes
    let testFilteredData = teamFilteredData;
    if (filters.athleteName.length > 0) {
      testFilteredData = testFilteredData.filter(item => filters.athleteName.includes(item.athlete_name));
    }
    const uniqueTestNames = [...new Set(testFilteredData.map(item => item.test_name).filter(Boolean))];
    
    return {
      teamNames: uniqueTeamNames,
      athletes: uniqueAthletes,
      testNames: uniqueTestNames
    };
  }, [data, filters.teamName, filters.athleteName]);

  // Filter elite data based on comparator filters
  const filteredEliteData = useMemo(() => {
    if (!eliteData) return [];
    
    let filtered = eliteData;
    
    if (filters.sport.length > 0) {
      filtered = filtered.filter(item => filters.sport.includes(item.Sport));
    }
    if (filters.sex.length > 0) {
      filtered = filtered.filter(item => filters.sex.includes(item.Sex));
    }
    if (filters.weightCategory) {
      filtered = filtered.filter(item => item["Weight Category (kg)"] === filters.weightCategory);
    }
    if (filters.ageGroup) {
      filtered = filtered.filter(item => item["Age Group"] === parseInt(filters.ageGroup));
    }
    
    return filtered;
  }, [eliteData, filters.sport, filters.sex, filters.weightCategory, filters.ageGroup]);

  // Filter individual data based on individual filters
  const filteredIndividualData = useMemo(() => {
    let filtered = data;
    
    if (filters.athleteName.length > 0) {
      filtered = filtered.filter(item => filters.athleteName.includes(item.athlete_name));
    }
    if (filters.teamName.length > 0) {
      filtered = filtered.filter(item => filters.teamName.includes(item.team_name));
    }
    if (filters.testName) {
      filtered = filtered.filter(item => item.test_name === filters.testName);
    }
    
    return filtered;
  }, [data, filters.athleteName, filters.teamName, filters.testName]);

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
          <EliteComparisonFilters
            filters={filters}
            setFilters={setFilters}
            eliteFilterOptions={eliteFilterOptions}
            individualFilterOptions={individualFilterOptions}
            isEliteDataLoading={eliteDataLoading}
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
            Comparisons Amongst Elites
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <EliteComparisonChart
          eliteData={filteredEliteData}
          individualData={filteredIndividualData}
          metricType={filters.metricType}
          isLoading={eliteDataLoading}
        />
        </CardContent>
      </Card>
    </div>
  );
};