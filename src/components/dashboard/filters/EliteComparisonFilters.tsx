
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";

interface EliteComparisonFiltersProps {
  eliteMetrics: any[];
  athleteData: TestData[];
  selectedEliteFilters: any;
  setSelectedEliteFilters: (v: any) => void;
  selectedIndividualFilters: any;
  setSelectedIndividualFilters: (v: any) => void;
  metricType: string;
  setMetricType: (v: string) => void;
  onFilterChange: () => void;
}

export const EliteComparisonFilters: React.FC<EliteComparisonFiltersProps> = ({
  eliteMetrics,
  athleteData,
  selectedEliteFilters,
  setSelectedEliteFilters,
  selectedIndividualFilters,
  setSelectedIndividualFilters,
  metricType,
  setMetricType,
  onFilterChange
}) => {
  // Elite metric dropdown values
  const sports = useMemo(() => Array.from(new Set(eliteMetrics.map(r => r.sport).filter(Boolean))), [eliteMetrics]);
  const sexes = useMemo(() => Array.from(new Set(eliteMetrics.map(r => r.sex).filter(Boolean))), [eliteMetrics]);
  const weightCats = useMemo(() => Array.from(new Set(eliteMetrics.map(r => String(r.weight_category_kg)).filter(Boolean))), [eliteMetrics]);
  const ageGroups = useMemo(() => Array.from(new Set(eliteMetrics.map(r => r.age_group).filter(Boolean))), [eliteMetrics]);
  // Individual metric dropdown values
  const athleteNames = useMemo(() => Array.from(new Set(athleteData.map(d => d.athlete_name).filter(Boolean))), [athleteData]);
  // Fix: only include body_mass if present; ensure it's a string
  const athleteWeights = useMemo(
    () =>
      Array.from(
        new Set(
          athleteData
            .map(d => {
              const metrics = d.metrics;
              if (metrics && "body_mass" in metrics && metrics.body_mass !== undefined) {
                return String(metrics.body_mass);
              }
              return undefined;
            })
            .filter(Boolean)
        )
      ),
    [athleteData]
  );
  const testNames = useMemo(() => Array.from(new Set(athleteData.map(d => d.test_name).filter(Boolean))), [athleteData]);
  const metricTypes = useMemo(() => {
    // Both sources can provide metric types
    const m1 = eliteMetrics.map(d => d.metric_type);
    const m2 = athleteData.flatMap(d => Object.keys(d.metrics || {}));
    return Array.from(new Set([...m1, ...m2])).filter(Boolean);
  }, [eliteMetrics, athleteData]);

  // Handlers for elite
  const handleEliteChange = (field: string, val: any) => {
    setSelectedEliteFilters((prev: any) => ({ ...prev, [field]: val }));
    onFilterChange();
  };

  // Handlers for individual
  const handleIndividualChange = (field: string, val: any) => {
    setSelectedIndividualFilters((prev: any) => ({ ...prev, [field]: val }));
    onFilterChange();
  };

  // Handlers for metricType
  const handleMetricTypeChange = (val: string) => {
    setMetricType(val);
    onFilterChange();
  };

  return (
    <Card className="bg-white border-amber-200 mb-8">
      <CardContent className="pt-4">
        <div className="flex justify-center mb-3">
          <Button variant="default" className="!bg-amber-600 hover:bg-amber-700 text-white w-auto min-w-[260px] text-lg font-semibold mx-auto justify-center block text-center shadow">
            Comparisons Amongst Elites
          </Button>
        </div>
        {/* ROW 1 - Elite Comparison Filters */}
        <div className="grid grid-cols-5 gap-4 mb-3 items-end">
          <div className="text-sm font-medium text-center pb-0 pt-2">Comparison Filters</div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Sport</label>
            <Select value={selectedEliteFilters.sport} onValueChange={v => handleEliteChange('sport', v)}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sports</SelectItem>
                {sports.map(sport => (
                  <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Sex</label>
            <Select value={selectedEliteFilters.sex} onValueChange={v => handleEliteChange('sex', v)}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {sexes.map(sex => (
                  <SelectItem key={sex} value={sex}>{sex}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Weight Category (kg)</label>
            <MultiSelectDropdown
              options={weightCats.map(cat => ({ value: cat, label: cat }))}
              value={selectedEliteFilters.weight_category_kg || []}
              onChange={v => handleEliteChange('weight_category_kg', v)}
              placeholder="All"
              className="text-center bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Age Group</label>
            <MultiSelectDropdown
              options={ageGroups.map(ag => ({ value: ag, label: ag }))}
              value={selectedEliteFilters.age_group || []}
              onChange={v => handleEliteChange('age_group', v)}
              placeholder="All"
              className="text-center bg-white"
            />
          </div>
        </div>
        {/* ROW 2 - Individual Filters */}
        <div className="grid grid-cols-5 gap-4 items-end">
          <div className="text-sm font-medium text-center pb-0 pt-2">Individual Filters</div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Athlete Name</label>
            <MultiSelectDropdown
              options={athleteNames.map(n => ({ value: n, label: n }))}
              value={selectedIndividualFilters.athlete_names || []}
              onChange={v => handleIndividualChange('athlete_names', v)}
              placeholder="All"
              className="text-center bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Weight (kg)</label>
            <MultiSelectDropdown
              options={athleteWeights.map(w => ({ value: w, label: w }))}
              value={selectedIndividualFilters.weights || []}
              onChange={v => handleIndividualChange('weights', v)}
              placeholder="All"
              className="text-center bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Test Name</label>
            <Select value={selectedIndividualFilters.test_name || ""} onValueChange={v => handleIndividualChange('test_name', v)}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {testNames.map(test => (
                  <SelectItem key={test} value={test}>{test}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 text-center">Metric Type</label>
            <Select value={metricType || ""} onValueChange={handleMetricTypeChange}>
              <SelectTrigger className="bg-white text-center w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {metricTypes.map(mt => (
                  <SelectItem key={mt} value={mt}>{mt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
