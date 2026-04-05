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
    sport: string[];
    sex: string[];
    weightCategory: string;
    ageGroup: string;
    athleteName: string[];
    teamName: string[];
    testName: string;
    metricType: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    sport: string[];
    sex: string[];
    weightCategory: string;
    ageGroup: string;
    athleteName: string[];
    teamName: string[];
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
    teamNames: string[];
    testNames: string[];
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
  const [hiddenCMJColumns, setHiddenCMJColumns] = useState<string[]>([]);
  
  // Update hidden columns from localStorage on mount and when page gains focus
  useEffect(() => {
    const updateHiddenColumns = () => {
      const stored = localStorage.getItem('hiddenCMJColumns');
      const parsed = stored ? JSON.parse(stored) : [];
      console.log('Hidden CMJ columns from localStorage:', parsed);
      setHiddenCMJColumns(parsed);
    };
    
    updateHiddenColumns();
    
    // Update when window gains focus (switching tabs/routes)
    window.addEventListener('focus', updateHiddenColumns);
    
    return () => {
      window.removeEventListener('focus', updateHiddenColumns);
    };
  }, []);
  
  // Listen for localStorage changes (when columns are hidden/deleted)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hiddenCMJColumns') {
        const newHidden = e.newValue ? JSON.parse(e.newValue) : [];
        setHiddenCMJColumns(newHidden);
      }
    };

    // Also listen for custom event (for same-tab updates)
    const handleCustomUpdate = () => {
      const stored = localStorage.getItem('hiddenCMJColumns');
      setHiddenCMJColumns(stored ? JSON.parse(stored) : []);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hiddenColumnsUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hiddenColumnsUpdated', handleCustomUpdate);
    };
  }, []);

  // Fetch exercise configurations and build dynamic metrics
  useEffect(() => {
    const fetchExerciseConfigs = async () => {
      const { data, error } = await supabase
        .from('elite_exercise_configs')
        .select('*')
        .order('test_name');
      
      if (!error && data) {
        setExerciseConfigs(data);
      }
    };
    
    fetchExerciseConfigs();
  }, []);

  // Update available metric types when configs or hidden columns change
  useEffect(() => {
    console.log('Updating metric types with hiddenCMJColumns:', hiddenCMJColumns);
    
    // Filter CMJ dynamic columns based on hidden state
    const visibleCMJColumns = cmjDynamicColumns.filter(metric => {
      if (metric === 'CMJ Jump Height (cm)' && hiddenCMJColumns.includes('cmj_height')) {
        console.log('Filtering out CMJ Jump Height (cm)');
        return false;
      }
      if (metric === 'CMJ Peak Power (W)' && hiddenCMJColumns.includes('cmj_power')) {
        console.log('Filtering out CMJ Peak Power (W)');
        return false;
      }
      return true;
    });
    
    console.log('Visible CMJ columns:', visibleCMJColumns);
    
    // Build dynamic metric types from exercise configs
    const dynamicMetrics = new Set<string>();
    exerciseConfigs.forEach(config => {
      config.metrics.forEach((metric: string) => {
        dynamicMetrics.add(`${config.test_name} - ${metric}`);
      });
    });
    
    // Only show dynamic columns (CMJ + exercise configs)
    const finalMetrics = [...visibleCMJColumns, ...Array.from(dynamicMetrics)];
    console.log('Final available metrics:', finalMetrics);
    setAvailableMetricTypes(finalMetrics);
  }, [exerciseConfigs, hiddenCMJColumns]);
  
  // Get test names from both static and dynamic configs
  const availableTestNames = React.useMemo(() => {
    const dynamicTests = exerciseConfigs.map(config => config.test_name);
    return [...new Set([...individualFilterOptions.testNames, ...dynamicTests])];
  }, [individualFilterOptions.testNames, exerciseConfigs]);
  
  // Comparator filter dependencies
  const sportEnabled = true; // Always enabled
  const sexEnabled = filters.sport.length > 0;
  const weightCategoryEnabled = filters.sex.length > 0;
  const ageGroupEnabled = !!filters.weightCategory;

  // Individual filter dependencies
  const teamNameEnabled = true; // Always enabled
  const athleteEnabled = filters.teamName.length > 0;
  const testNameEnabled = filters.athleteName.length > 0;
  const metricTypeEnabled = !!filters.testName;

  // Handle cascading filter changes for Comparator Filters
  const handleSportChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      sport: value,
      sex: value.length === 0 ? [] : (prev.sex.length === 0 ? ["all"] : prev.sex),
      weightCategory: value.length === 0 ? "" : prev.weightCategory,
      ageGroup: value.length === 0 ? "" : prev.ageGroup
    }));
  };

  const handleSexChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      sex: value,
      weightCategory: value.length === 0 ? "" : prev.weightCategory,
      ageGroup: value.length === 0 ? "" : prev.ageGroup
    }));
  };

  const handleWeightCategoryChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      weightCategory: value,
      ageGroup: ""
    }));
  };

  // Handle cascading filter changes for Individual Filters
  const handleTeamNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      teamName: value,
      athleteName: value.length === 0 ? [] : prev.athleteName,
      testName: value.length === 0 ? "" : prev.testName,
      metricType: value.length === 0 ? "" : prev.metricType
    }));
  };

  const handleAthleteNameChange = (value: string[]) => {
    setFilters(prev => ({
      ...prev,
      athleteName: value,
      testName: value.length === 0 ? "" : prev.testName,
      metricType: value.length === 0 ? "" : prev.metricType
    }));
  };

  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      testName: value,
      metricType: ""
    }));
  };

  const teamNameOptions = individualFilterOptions.teamNames.map(team => ({ 
    value: team, 
    label: team 
  }));

  const athleteOptions = individualFilterOptions.athletes.map(athlete => ({ 
    value: athlete, 
    label: athlete 
  }));

  const sportOptions = eliteFilterOptions.sports.map(sport => ({
    value: sport,
    label: sport
  }));

  const sexOptions = eliteFilterOptions.sexes.map(sex => ({
    value: sex,
    label: sex.charAt(0).toUpperCase() + sex.slice(1)
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
            <MultiSelectDropdown
              options={sportOptions}
              value={filters.sport}
              onChange={handleSportChange}
              placeholder="Select Sports"
              className="bg-white"
              labelClassName="bg-white"
              disabled={!sportEnabled || isEliteDataLoading}
            />
          </div>

          {/* Sex */}
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-2 text-center ${!sexEnabled ? "text-gray-400" : "text-gray-700"}`}>Sex</label>
            <MultiSelectDropdown
              options={sexOptions}
              value={filters.sex}
              onChange={handleSexChange}
              placeholder="Select Sex"
              className={`${!sexEnabled ? "bg-gray-100 opacity-60" : "bg-white"}`}
              labelClassName="bg-white"
              disabled={!sexEnabled || isEliteDataLoading}
            />
          </div>

          {/* Weight Category */}
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-2 text-center ${!weightCategoryEnabled ? "text-gray-400" : "text-gray-700"}`}>Weight Category (kg)</label>
            <Select 
              value={filters.weightCategory} 
              onValueChange={handleWeightCategoryChange}
              disabled={isEliteDataLoading || !weightCategoryEnabled}
            >
              <SelectTrigger className={`${(isEliteDataLoading || !weightCategoryEnabled) ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white"}`}>
                <SelectValue placeholder="Select Weight Category" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
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
            <label className={`block text-sm font-medium mb-2 text-center ${!ageGroupEnabled ? "text-gray-400" : "text-gray-700"}`}>Age Group</label>
            <Select 
              value={filters.ageGroup} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, ageGroup: value }))}
              disabled={isEliteDataLoading || !ageGroupEnabled}
            >
              <SelectTrigger className={`${(isEliteDataLoading || !ageGroupEnabled) ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white"}`}>
                <SelectValue placeholder="Select Age Group" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
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
          {/* Team Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Team Name</label>
            <MultiSelectDropdown
              options={teamNameOptions}
              value={filters.teamName}
              onChange={handleTeamNameChange}
              placeholder="Select Teams"
              className="bg-white"
              labelClassName="bg-white"
              disabled={!teamNameEnabled}
            />
          </div>

          {/* Athlete Name */}
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-2 text-center ${!athleteEnabled ? "text-gray-400" : "text-gray-700"}`}>Athlete Name</label>
            <MultiSelectDropdown
              options={athleteOptions}
              value={filters.athleteName}
              onChange={handleAthleteNameChange}
              placeholder="Select Athletes"
              className={`${!athleteEnabled ? "bg-gray-100 opacity-60" : "bg-white"}`}
              labelClassName="bg-white"
              disabled={!athleteEnabled}
            />
          </div>

          {/* Test Name */}
          <div className="flex flex-col">
            <label className={`block text-sm font-medium mb-2 text-center ${!testNameEnabled ? "text-gray-400" : "text-gray-700"}`}>Test Name</label>
            <Select value={filters.testName} onValueChange={handleTestNameChange} disabled={!testNameEnabled}>
              <SelectTrigger className={`${!testNameEnabled ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white"}`}>
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
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
            <label className={`block text-sm font-medium mb-2 text-center ${!metricTypeEnabled ? "text-gray-400" : "text-gray-700"}`}>Metric Type</label>
            <Select 
              value={filters.metricType} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, metricType: value }))}
              disabled={!metricTypeEnabled}
            >
              <SelectTrigger className={`${!metricTypeEnabled ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white"}`}>
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
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