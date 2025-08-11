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
}

export const EliteComparison = ({ data, resetFiltersKey }: EliteComparisonProps) => {
  const { data: eliteData, isLoading: eliteDataLoading } = useEliteAthleteData();
  
  const [filters, setFilters] = useState({
    // Comparator Filters (Elite Data)
    sport: "all",
    sex: "all", 
    weightCategory: "all",
    ageGroup: "all",
    // Individual Filters (CC Athletics Data)
    athleteName: [] as string[],
    weight: "all",
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
      weight: "all",
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
    return {
      athletes: [...new Set(data.map(item => item.athlete_name).filter(Boolean))],
      testNames: [...new Set(data.map(item => item.test_name).filter(Boolean))],
      weights: [...new Set(data.map(item => {
        const metrics = item.metrics as any;
        return metrics?.body_mass;
      }).filter(Boolean))].sort((a, b) => a - b)
    };
  }, [data]);

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
    if (filters.testName !== "all") {
      filtered = filtered.filter(item => item.test_name === filters.testName);
    }
    if (filters.weight !== "all") {
      filtered = filtered.filter(item => {
        const metrics = item.metrics as any;
        return metrics?.body_mass === parseFloat(filters.weight);
      });
    }
    
    return filtered;
  }, [data, filters.athleteName, filters.testName, filters.weight]);

  return (
    <Card className="bg-gray-100 border-gray-300">
      <CardHeader>
        <EliteComparisonFilters
          filters={filters}
          setFilters={setFilters}
          eliteFilterOptions={eliteFilterOptions}
          individualFilterOptions={individualFilterOptions}
          isEliteDataLoading={eliteDataLoading}
        />
        {/* Header in rounded box */}
        <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm">
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
  );
};