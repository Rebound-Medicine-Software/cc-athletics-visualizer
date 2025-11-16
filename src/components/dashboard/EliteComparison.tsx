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
    sport: "all",
    sex: "all", 
    weightCategory: "all",
    ageGroup: "all",
    // Individual Filters (CC Athletics Data)
    athleteName: [] as string[],
    teamName: [] as string[],
    testName: "all",
    metricType: "all"
  });

  // Reset all filters when key changes
  useEffect(() => {
    setFilters({
      sport: "all",
      sex: "all",
      weightCategory: "all", 
      ageGroup: "all",
      athleteName: [],
      teamName: [],
      testName: "all",
      metricType: "all"
    });
  }, [resetFiltersKey]);

  // Process elite data for filter options
  const eliteFilterOptions = useMemo(() => {
    if (!eliteData) return { sports: [], sexes: [], weightCategories: [], ageGroups: [] };

    return {
      sports: [...new Set(eliteData.map(item => item.Sport).filter(Boolean))],
      sexes: [...new Set(eliteData.map(item => item.Sex).filter(Boolean))],
      weightCategories: [...new Set(eliteData.map(item => item["Weight Category (kg)"]).filter(Boolean))],
      ageGroups: [...new Set(eliteData.map(item => item["Age Group"]).filter(Boolean))].sort((a, b) => a - b)
    };
  }, [eliteData]);

  // Process CC Athletics data for filter options
  const individualFilterOptions = useMemo(() => {
    // Get unique athletes first
    const uniqueAthletes = [...new Set(data.map(item => item.athlete_name).filter(Boolean))];
    
    // Get unique team names
    const uniqueTeamNames = [...new Set(data.map(item => item.team_name).filter(Boolean))];
    
    // Filter data to selected athletes if any are selected
    const filteredData = filters.athleteName.length > 0 
      ? data.filter(item => filters.athleteName.includes(item.athlete_name))
      : data;
    
    return {
      athletes: uniqueAthletes,
      teamNames: uniqueTeamNames,
      testNames: [...new Set(filteredData.map(item => item.test_name).filter(Boolean))]
    };
  }, [data, filters.athleteName]);

  // Filter elite data based on comparator filters
  const filteredEliteData = useMemo(() => {
    if (!eliteData) return [];
    
    let filtered = eliteData;
    
    if (filters.sport !== "all") {
      filtered = filtered.filter(item => item.Sport === filters.sport);
    }
    if (filters.sex !== "all") {
      filtered = filtered.filter(item => item.Sex === filters.sex);
    }
    if (filters.weightCategory !== "all") {
      filtered = filtered.filter(item => item["Weight Category (kg)"] === filters.weightCategory);
    }
    if (filters.ageGroup !== "all") {
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
    if (filters.testName !== "all") {
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