
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";
import { TrendingUp, Users, Calendar, BarChart3 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

interface HighlightsSectionProps {
  data: TestData[];
  selectedTest: string;
  selectedTeams: string[];
  selectedAthletes: string[];
  selectedTestDates: string[];
  onTestChange: (test: string) => void;
  onTeamsChange: (teams: string[]) => void;
  onAthletesChange: (athletes: string[]) => void;
  onTestDatesChange: (dates: string[]) => void;
}

export const HighlightsSection = ({
  data = [],
  selectedTest,
  selectedTeams = [],
  selectedAthletes = [],
  selectedTestDates = [],
  onTestChange,
  onTeamsChange,
  onAthletesChange,
  onTestDatesChange
}: HighlightsSectionProps) => {
  console.log('HighlightsSection render - data length:', data?.length || 0);
  console.log('HighlightsSection - selectedTeams type:', typeof selectedTeams, 'value:', selectedTeams);
  console.log('HighlightsSection - selectedAthletes type:', typeof selectedAthletes, 'value:', selectedAthletes);
  console.log('HighlightsSection - selectedTestDates type:', typeof selectedTestDates, 'value:', selectedTestDates);

  // Safely get unique values with comprehensive null checks
  const safeData = React.useMemo(() => {
    if (!Array.isArray(data)) {
      console.log('Data is not an array, converting:', data);
      return [];
    }
    
    const filtered = data.filter(item => {
      if (!item || typeof item !== 'object') return false;
      return (
        typeof item.test_name === 'string' && item.test_name.trim() !== '' &&
        typeof item.team_name === 'string' && item.team_name.trim() !== '' &&
        typeof item.athlete_name === 'string' && item.athlete_name.trim() !== '' &&
        typeof item.test_date === 'string' && item.test_date.trim() !== ''
      );
    });
    
    console.log('Filtered safe data length:', filtered.length);
    return filtered;
  }, [data]);
  
  const uniqueTests = React.useMemo(() => {
    if (!safeData || safeData.length === 0) {
      return [];
    }
    
    const tests = safeData
      .map(d => d.test_name)
      .filter(test => test && test.trim() !== '')
      .filter((test, index, arr) => arr.indexOf(test) === index)
      .sort();
    
    console.log('Unique tests:', tests);
    return tests;
  }, [safeData]);
    
  const uniqueTeams = React.useMemo(() => {
    if (!safeData || safeData.length === 0) {
      return [];
    }
    
    const teams = safeData
      .map(d => d.team_name)
      .filter(team => team && team.trim() !== '')
      .filter((team, index, arr) => arr.indexOf(team) === index)
      .sort();
    
    console.log('Unique teams:', teams);
    return teams;
  }, [safeData]);
    
  const uniqueAthletes = React.useMemo(() => {
    if (!safeData || safeData.length === 0) {
      return [];
    }
    
    const athletes = safeData
      .map(d => d.athlete_name)
      .filter(athlete => athlete && athlete.trim() !== '')
      .filter((athlete, index, arr) => arr.indexOf(athlete) === index)
      .sort();
    
    console.log('Unique athletes:', athletes);
    return athletes;
  }, [safeData]);
    
  const uniqueTestDates = React.useMemo(() => {
    if (!safeData || safeData.length === 0) {
      return [];
    }
    
    const dates = safeData
      .map(d => d.test_date)
      .filter(date => date && date.trim() !== '')
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort();
    
    console.log('Unique test dates:', dates);
    return dates;
  }, [safeData]);

  // Convert arrays to options format with safety checks - ensuring correct format
  const teamOptions = React.useMemo(() => {
    const options = uniqueTeams.map(team => ({ 
      label: String(team), 
      value: String(team) 
    }));
    console.log('Team options:', options);
    return options;
  }, [uniqueTeams]);

  const athleteOptions = React.useMemo(() => {
    const options = uniqueAthletes.map(athlete => ({ 
      label: String(athlete), 
      value: String(athlete) 
    }));
    console.log('Athlete options:', options);
    return options;
  }, [uniqueAthletes]);

  const dateOptions = React.useMemo(() => {
    const options = uniqueTestDates.map(date => ({ 
      label: String(date), 
      value: String(date) 
    }));
    console.log('Date options:', options);
    return options;
  }, [uniqueTestDates]);

  // Ensure selected values are always string arrays
  const safeSelectedTeams = React.useMemo(() => {
    if (!Array.isArray(selectedTeams)) {
      console.log('selectedTeams is not an array, converting:', selectedTeams);
      return [];
    }
    const filtered = selectedTeams.filter(item => typeof item === 'string');
    console.log('Safe selected teams:', filtered);
    return filtered;
  }, [selectedTeams]);

  const safeSelectedAthletes = React.useMemo(() => {
    if (!Array.isArray(selectedAthletes)) {
      console.log('selectedAthletes is not an array, converting:', selectedAthletes);
      return [];
    }
    const filtered = selectedAthletes.filter(item => typeof item === 'string');
    console.log('Safe selected athletes:', filtered);
    return filtered;
  }, [selectedAthletes]);

  const safeSelectedTestDates = React.useMemo(() => {
    if (!Array.isArray(selectedTestDates)) {
      console.log('selectedTestDates is not an array, converting:', selectedTestDates);
      return [];
    }
    const filtered = selectedTestDates.filter(item => typeof item === 'string');
    console.log('Safe selected test dates:', filtered);
    return filtered;
  }, [selectedTestDates]);

  // Create safe event handlers that ensure string[] type
  const handleTeamsChange = React.useCallback((teams: string[]) => {
    console.log('handleTeamsChange called with:', teams, 'type:', typeof teams);
    if (Array.isArray(teams) && typeof onTeamsChange === 'function') {
      onTeamsChange(teams);
    } else {
      console.error('handleTeamsChange: Invalid teams array or onTeamsChange function');
    }
  }, [onTeamsChange]);

  const handleAthletesChange = React.useCallback((athletes: string[]) => {
    console.log('handleAthletesChange called with:', athletes, 'type:', typeof athletes);
    if (Array.isArray(athletes) && typeof onAthletesChange === 'function') {
      onAthletesChange(athletes);
    } else {
      console.error('handleAthletesChange: Invalid athletes array or onAthletesChange function');
    }
  }, [onAthletesChange]);

  const handleTestDatesChange = React.useCallback((dates: string[]) => {
    console.log('handleTestDatesChange called with:', dates, 'type:', typeof dates);
    if (Array.isArray(dates) && typeof onTestDatesChange === 'function') {
      onTestDatesChange(dates);
    } else {
      console.error('handleTestDatesChange: Invalid dates array or onTestDatesChange function');
    }
  }, [onTestDatesChange]);

  // Filter data based on all selections
  const filteredData = React.useMemo(() => {
    return safeData.filter(test => {
      if (!test) return false;
      const testMatch = !selectedTest || test.test_name === selectedTest;
      const teamMatch = safeSelectedTeams.length === 0 || safeSelectedTeams.includes(test.team_name);
      const athleteMatch = safeSelectedAthletes.length === 0 || safeSelectedAthletes.includes(test.athlete_name);
      const dateMatch = safeSelectedTestDates.length === 0 || safeSelectedTestDates.includes(test.test_date);
      return testMatch && teamMatch && athleteMatch && dateMatch;
    });
  }, [safeData, selectedTest, safeSelectedTeams, safeSelectedAthletes, safeSelectedTestDates]);

  // Enhanced metrics calculation matching Looker Studio format
  const getHighlights = () => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalTests: 0,
        avgPerformance: "N/A",
        topPerformer: "N/A",
        latestTest: "N/A"
      };
    }

    const totalTests = filteredData.length;
    
    // Calculate average performance based on test type
    const getMetricValue = (test: any, keys: string[]) => {
      if (!test?.metrics) return 0;
      const metrics = test.metrics;
      
      for (const key of keys) {
        if (metrics[key] && typeof metrics[key] === 'number' && metrics[key] > 0) {
          return metrics[key];
        }
      }
      return 0;
    };

    let avgPerformance = "N/A";
    let performanceValues: number[] = [];

    // Get performance values based on test type
    if (selectedTest) {
      switch (selectedTest) {
        case "Countermovement Jump":
        case "Squat Jump":
        case "Drop Jump":
          performanceValues = filteredData.map(test => 
            getMetricValue(test, ['jump_height_ft', 'jump_height_ni', 'peak_force'])
          ).filter(val => val > 0);
          break;
        case "Pogo Jump":
          performanceValues = filteredData.map(test => 
            getMetricValue(test, ['jump_height', 'avg_jump_height', 'power', 'avg_power'])
          ).filter(val => val > 0);
          break;
        default:
          // Isometric tests
          performanceValues = filteredData.map(test => 
            getMetricValue(test, ['force_peak', 'rfd_max', 'peak_force'])
          ).filter(val => val > 0);
          break;
      }
    } else {
      // No specific test selected, use peak force as general metric
      performanceValues = filteredData.map(test => 
        getMetricValue(test, ['peak_force', 'force_peak'])
      ).filter(val => val > 0);
    }

    if (performanceValues.length > 0) {
      const avg = performanceValues.reduce((sum, val) => sum + val, 0) / performanceValues.length;
      avgPerformance = Math.round(avg).toString();
    }

    // Find top performer based on best single performance
    const athletePerformances = filteredData.reduce((acc, test) => {
      if (!test?.athlete_name) return acc;
      
      let performanceValue = 0;
      if (selectedTest) {
        switch (selectedTest) {
          case "Countermovement Jump":
          case "Squat Jump":
          case "Drop Jump":
            performanceValue = getMetricValue(test, ['jump_height_ft', 'jump_height_ni']);
            break;
          case "Pogo Jump":
            performanceValue = getMetricValue(test, ['jump_height', 'avg_jump_height']);
            break;
          default:
            performanceValue = getMetricValue(test, ['force_peak', 'rfd_max']);
            break;
        }
      } else {
        performanceValue = getMetricValue(test, ['peak_force', 'force_peak']);
      }
      
      if (performanceValue > 0) {
        if (!acc[test.athlete_name] || acc[test.athlete_name] < performanceValue) {
          acc[test.athlete_name] = performanceValue;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const topPerformer = Object.entries(athletePerformances)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";

    const latestTest = uniqueTestDates.length > 0 ? uniqueTestDates[uniqueTestDates.length - 1] : "N/A";

    return { totalTests, avgPerformance, topPerformer, latestTest };
  };

  const highlights = getHighlights();

  return (
    <div className="space-y-6">
      {/* Test Selection Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {selectedTest ? `Analysis: ${selectedTest}` : "Select Test for Analysis"}
            </h2>
            <p className="text-gray-600 text-sm">
              {selectedTest 
                ? `Comprehensive analysis for ${selectedTest} with applied filters`
                : "Choose a test type to begin detailed performance analysis"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">Performance Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Test Type</label>
              <Select value={selectedTest || ""} onValueChange={onTestChange}>
                <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Select Test Type" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {uniqueTests.map(test => (
                    <SelectItem key={test} value={test}>
                      {test}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Team</label>
              <MultiSelect
                options={teamOptions}
                selected={safeSelectedTeams}
                onChange={handleTeamsChange}
                placeholder="Select Teams"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Athlete</label>
              <MultiSelect
                options={athleteOptions}
                selected={safeSelectedAthletes}
                onChange={handleAthletesChange}
                placeholder="Select Athletes"
                className="bg-white border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Test Date</label>
              <MultiSelect
                options={dateOptions}
                selected={safeSelectedTestDates}
                onChange={handleTestDatesChange}
                placeholder="Select Dates"
                className="bg-white border-gray-300"
              />
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.avgPerformance}</div>
              <div className="text-sm text-gray-600">
                {selectedTest?.includes('Jump') ? 'Avg Performance' : 'Avg Peak Force (N)'}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.topPerformer}</div>
              <div className="text-sm text-gray-600">Top Performer</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{highlights.latestTest}</div>
              <div className="text-sm text-gray-600">Latest Test</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
