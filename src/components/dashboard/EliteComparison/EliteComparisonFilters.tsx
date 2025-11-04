import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { supabase } from "@/integrations/supabase/client";

interface EliteComparisonFiltersProps {
  filters: {
    sport: string;
    sex: string;
    weightCategory: string;
    ageGroup: string;
    athleteName: string[];
    weight: string[];
    testName: string;
    metricType: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    sport: string;
    sex: string;
    weightCategory: string;
    ageGroup: string;
    athleteName: string[];
    weight: string[];
    testName: string;
    metricType: string;
  }>>;
  eliteFilterOptions: {
    sports: string[];
    sexes: string[];
    weightCategories: string[];
    ageGroups: number[];
  };
  individualFilterOptions: {
    athletes: string[];
    testNames: string[];
    weights: number[];
  };
  isEliteDataLoading: boolean;
}

// Dynamic columns from Elite Athlete Data table (CMJ columns)
const cmjDynamicColumns = [
  "CMJ Jump Height (cm)",
  "CMJ Peak Power (W)"
];

interface ExerciseConfig {
  id: string;
  test_name: string;
  metrics: string[];
}

export const EliteComparisonFilters = ({
  filters,
  setFilters,
  eliteFilterOptions,
  individualFilterOptions,
  isEliteDataLoading,
}: EliteComparisonFiltersProps) => {
  const [exerciseConfigs, setExerciseConfigs] = useState<ExerciseConfig[]>([]);
  const [availableMetricTypes, setAvailableMetricTypes] = useState<string[]>([]);
  
  // Fetch exercise configurations and build dynamic metrics
  useEffect(() => {
    const fetchExerciseConfigs = async () => {
      const { data, error } = await supabase
        .from('elite_exercise_configs')
        .select('*')
        .order('test_name');
      
      if (!error && data) {
        setExerciseConfigs(data);
        
        // Get hidden CMJ columns from localStorage
        const hiddenCMJColumns = (() => {
          const stored = localStorage.getItem('hiddenCMJColumns');
          return stored ? JSON.parse(stored) : [];
        })();
        
        // Filter CMJ dynamic columns based on hidden state
        const visibleCMJColumns = cmjDynamicColumns.filter(metric => {
          if (metric === 'CMJ Jump Height (cm)' && hiddenCMJColumns.includes('cmj_height')) {
            return false;
          }
          if (metric === 'CMJ Peak Power (W)' && hiddenCMJColumns.includes('cmj_power')) {
            return false;
          }
          return true;
        });
        
        // Build dynamic metric types from exercise configs
        const dynamicMetrics = new Set<string>();
        data.forEach(config => {
          config.metrics.forEach((metric: string) => {
            dynamicMetrics.add(`${config.test_name} - ${metric}`);
          });
        });
        
        // Only show dynamic columns (CMJ + exercise configs)
        setAvailableMetricTypes([...visibleCMJColumns, ...Array.from(dynamicMetrics)]);
      }
    };
    
    fetchExerciseConfigs();
  }, []);
  
  // Get test names from both static and dynamic configs
  const availableTestNames = React.useMemo(() => {
    const dynamicTests = exerciseConfigs.map(config => config.test_name);
    return [...new Set([...individualFilterOptions.testNames, ...dynamicTests])];
  }, [individualFilterOptions.testNames, exerciseConfigs]);
  
  // Individual filter dependencies
  const athleteEnabled = true; // Always enabled
  const weightEnabled = filters.athleteName.length > 0;
  const testNameEnabled = filters.weight.length > 0;
  const metricTypeEnabled = filters.testName !== "all";

  // Handle cascading filter changes for Individual Filters
  const handleAthleteNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      athleteName: value,
      weight: value.length === 0 ? [] : prev.weight,
      testName: value.length === 0 ? "all" : prev.testName,
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  const handleWeightChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      weight: value,
      testName: value.length === 0 ? "all" : prev.testName,
      metricType: value.length === 0 ? "all" : prev.metricType
    }));
  };

  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value,
      metricType: value === "all" ? "all" : prev.metricType
    }));
  };

  const athleteOptions = individualFilterOptions.athletes.map(athlete => ({ 
    value: athlete, 
    label: athlete 
  }));

  const weightOptions = individualFilterOptions.weights.map(weight => ({
    value: weight.toString(),
    label: `${weight} kg`
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 shadow-sm mb-4 max-w-full">
      {/* Comparator Filters Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 text-center">Comparator Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Sport */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Sport</label>
            <Select 
              value={filters.sport} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, sport: value }))}
              disabled={isEliteDataLoading}
            >
              <SelectTrigger className={`${isEliteDataLoading ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Sport" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Sports</SelectItem>
                {eliteFilterOptions.sports.map(sport => (
                  <SelectItem key={sport} value={sport}>
                    {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sex */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Sex</label>
            <Select 
              value={filters.sex} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, sex: value }))}
              disabled={isEliteDataLoading}
            >
              <SelectTrigger className={`${isEliteDataLoading ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Sex" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All</SelectItem>
                {eliteFilterOptions.sexes.map(sex => (
                  <SelectItem key={sex} value={sex}>
                    {sex.charAt(0).toUpperCase() + sex.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weight Category */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Weight Category (kg)</label>
            <Select 
              value={filters.weightCategory} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, weightCategory: value }))}
              disabled={isEliteDataLoading}
            >
              <SelectTrigger className={`${isEliteDataLoading ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Weight Category" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {eliteFilterOptions.weightCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Age Group */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Age Group</label>
            <Select 
              value={filters.ageGroup} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, ageGroup: value }))}
              disabled={isEliteDataLoading}
            >
              <SelectTrigger className={`${isEliteDataLoading ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Age Group" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Ages</SelectItem>
                {eliteFilterOptions.ageGroups.map(age => (
                  <SelectItem key={age} value={age.toString()}>
                    {age} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Individual Filters Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 text-center">Individual Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Athlete Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.athleteName}
              onChange={handleAthleteNameChange}
              placeholder="Select Athletes"
              className="bg-white"
              labelClassName="bg-white"
            />
          </div>

          {/* Weight */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Weight (kg)</label>
            <MultiSelectDropdown
              options={weightOptions}
              value={filters.weight}
              onChange={handleWeightChange}
              placeholder="Select Weights"
              className="bg-white"
              labelClassName="bg-white"
              disabled={!weightEnabled}
            />
          </div>

          {/* Test Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
            <Select value={filters.testName} onValueChange={handleTestNameChange} disabled={!testNameEnabled}>
              <SelectTrigger className={`${!testNameEnabled ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Tests</SelectItem>
                {availableTestNames.map(test => (
                  <SelectItem key={test} value={test}>
                    {test}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select 
              value={filters.metricType} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, metricType: value }))}
              disabled={!metricTypeEnabled}
            >
              <SelectTrigger className={`${!metricTypeEnabled ? "bg-gray-100 opacity-60" : "bg-white"}`}>
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
          </div>
        </div>
      </div>
    </div>
  );
};