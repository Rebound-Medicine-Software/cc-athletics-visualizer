import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea, Cell, LabelList } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { Activity, Users, Target, TrendingUp, Clock, Maximize2, Minimize2, Filter } from "lucide-react";
import { metricCaseLogic } from "./chart/useMetricCaseLogic";
import { getMetricTypesForTest } from "./filters/filterUtils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEliteAthleteData } from "@/hooks/useEliteAthleteData";

interface LiveDataSectionProps {
  data: TestData[];
  selectedTeams: string[];
  branding?: any;
}

export const LiveDataSection = ({ data, selectedTeams, branding }: LiveDataSectionProps) => {
  const [selectedSex, setSelectedSex] = useState<string>("all");
  const [selectedMetricType, setSelectedMetricType] = useState<string>("jump_height_ft");
  const [lastDataLength, setLastDataLength] = useState(0);
  const [currentTestName, setCurrentTestName] = useState<string>("Countermovement Jump");
  const [athleteAvatars, setAthleteAvatars] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartCardRef = useRef<HTMLDivElement>(null);

  // Comparative filter state (from Elite Athlete Data)
  const { data: eliteData } = useEliteAthleteData();
  const [filterSport, setFilterSport] = useState<string>("");
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>("");
  const [filterWeightCategory, setFilterWeightCategory] = useState<string>("");
  const [exerciseConfigs, setExerciseConfigs] = useState<{ id: string; test_name: string; metrics: string[] }[]>([]);
  const [hiddenCMJColumns, setHiddenCMJColumns] = useState<string[]>(() => {
    const stored = localStorage.getItem('hiddenCMJColumns');
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch exercise configs and listen for hidden column changes
  useEffect(() => {
    const fetchConfigs = async () => {
      const { data, error } = await supabase
        .from('elite_exercise_configs')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) setExerciseConfigs(data);
    };
    fetchConfigs();

    const handleHiddenUpdate = () => {
      const stored = localStorage.getItem('hiddenCMJColumns');
      setHiddenCMJColumns(stored ? JSON.parse(stored) : []);
    };
    window.addEventListener('hiddenColumnsUpdated', handleHiddenUpdate);
    return () => window.removeEventListener('hiddenColumnsUpdated', handleHiddenUpdate);
  }, []);

  // Cascading filter options derived from Elite Athlete Data
  const eliteFilterOptions = useMemo(() => {
    if (!eliteData) return { sports: [], ageGroups: [], weightCategories: [] };

    const sports = [...new Set(eliteData.map(d => d.Sport).filter(Boolean))].sort();

    const sportFiltered = filterSport
      ? eliteData.filter(d => d.Sport === filterSport)
      : eliteData;

    const ageGroups = [...new Set(
      sportFiltered
        .map(d => d["Age Group"])
        .filter(v => v != null && v !== 0)
    )].sort((a, b) => a - b);

    const ageFiltered = filterAgeGroup
      ? sportFiltered.filter(d => String(d["Age Group"]) === filterAgeGroup)
      : sportFiltered;

    const weightCategories = [...new Set(
      ageFiltered
        .map(d => d["Weight Category (kg)"])
        .filter(v => v != null && v.trim() !== "")
    )].sort();

    return { sports, ageGroups, weightCategories };
  }, [eliteData, filterSport, filterAgeGroup]);

  // Filtered elite data based on comparative filters
  const filteredEliteData = useMemo(() => {
    if (!eliteData) return [];
    let filtered = eliteData;
    if (filterSport) filtered = filtered.filter(d => d.Sport === filterSport);
    if (filterAgeGroup) filtered = filtered.filter(d => String(d["Age Group"]) === filterAgeGroup);
    if (filterWeightCategory) filtered = filtered.filter(d => d["Weight Category (kg)"] === filterWeightCategory);
    return filtered;
  }, [eliteData, filterSport, filterAgeGroup, filterWeightCategory]);

  const toggleFullscreen = () => {
    if (!chartCardRef.current) return;
    
    if (!isFullscreen) {
      if (chartCardRef.current.requestFullscreen) {
        chartCardRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Debug data and detect new uploads
  useEffect(() => {
    const hasNewData = data?.length > lastDataLength;
    
    console.log('LiveDataSection - Data update:', {
      dataLength: data?.length || 0,
      lastDataLength,
      hasNewData,
      selectedTeamsLength: selectedTeams?.length || 0,
      sampleData: data?.[0] ? {
        athlete_name: data[0].athlete_name,
        test_name: data[0].test_name,
        test_date: data[0].test_date,
        team_name: data[0].team_name,
        gender: data[0].gender
      } : null
    });

    const latestByDate = getMostRecentTest();
    if (latestByDate) {
      const latestName = getFullTestName(latestByDate.test_name);
      if (latestName !== currentTestName) {
        console.log('🔄 Updating current test to (by date):', latestName);
        setCurrentTestName(latestName);
      }
    }

    if (hasNewData && data?.length) {
      console.log('🆕 NEW DATA DETECTED! Latest record by date:', latestByDate);
      setLastDataLength(data.length);
    }
  }, [data, selectedTeams, lastDataLength, currentTestName]);

  // Map abbreviated test names to full display names
  const getFullTestName = (testName: string): string => {
    const testNameMap: Record<string, string> = {
      "SJ": "Squat Jump",
      "DJ": "Drop Jump",
      "CMJ": "Countermovement Jump",
      "Pogo Jump": "Pogo Jump",
      "Squat Jump": "Squat Jump",
      "Drop Jump": "Drop Jump",
      "Countermovement Jump": "Countermovement Jump"
    };
    return testNameMap[testName] || testName;
  };

  // Get the most recent test being conducted
  const getMostRecentTest = () => {
    if (!data || data.length === 0) return null;
    
    // Find the absolute most recent test by date and time
    return data.reduce((latest, current) => {
      if (!latest) return current;
      return new Date(current.test_date) > new Date(latest.test_date) ? current : latest;
    }, data[0]);
  };

  const mostRecentTest = getMostRecentTest();

  // Auto-set sex based on most recent test athlete
  useEffect(() => {
    if (mostRecentTest?.gender && mostRecentTest.gender !== selectedSex) {
      console.log('Auto-setting sex to:', mostRecentTest.gender);
      setSelectedSex(mostRecentTest.gender);
    }
  }, [mostRecentTest?.gender]);

  // Get available metrics for current test
  const availableMetrics = getMetricTypesForTest(currentTestName);

  // Mapping for display names
  const getMetricDisplayName = (metricValue: string): string => {
    const displayMap: Record<string, string> = {
      "jump_height_ft": "Jump Height (cm)",
      "peak_power": "Peak Power",
      "relative_peak_power": "Relative Peak Power",
      "contact_time": "Contact Time",
      "rsi": "Reactive Strength Index",
      "flight_time": "Flight Time",
      "peak_velocity": "Take-off Velocity",
      "avg_rfd": "Average Rate of Force Development",
      "avg_propulsive_power": "Average Propulsive Power"
    };
    return displayMap[metricValue] || metricValue.replace('_', ' ');
  };

  // Convert internal metric key to display name for metricCaseLogic
  const getMetricDisplayNameForLogic = (metricKey: string): string => {
    return getMetricDisplayName(metricKey);
  };

  // Auto-update metric type when test changes
  useEffect(() => {
    if (availableMetrics.length > 0) {
      const metricMap: Record<string, string> = {
        "Jump Height (cm)": "jump_height_ft",
        "Peak Power": "peak_power", 
        "Relative Peak Power": "relative_peak_power",
        "Contact Time": "contact_time",
        "Reactive Strength Index": "rsi",
        "Flight Time": "flight_time",
        "Power": "peak_power",
        "Take-off Velocity": "peak_velocity",
        "Average Rate of Force Development": "avg_rfd",
        "Average Propulsive Power": "avg_propulsive_power"
      };
      
      const firstAvailableMetric = metricMap[availableMetrics[0]] || "jump_height_ft";
      setSelectedMetricType(firstAvailableMetric);
    }
  }, [currentTestName]);

  // Filter data based on selected teams and sex
  const filteredData = data.filter(d => {
    const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(d.team_name);
    const sexMatch = selectedSex === "all" || d.gender === selectedSex;
    
    // Filter for data within the last 7 days (more lenient than 24 hours for testing)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const testDate = new Date(d.test_date);
    const dateMatch = testDate >= sevenDaysAgo;
    
    console.log('Filtering test:', {
      athlete: d.athlete_name,
      team: d.team_name,
      test_date: d.test_date,
      testDate: testDate.toISOString(),
      sevenDaysAgo: sevenDaysAgo.toISOString(),
      dateMatch,
      teamMatch,
      sexMatch,
      gender: d.gender
    });
    
    return teamMatch && sexMatch && dateMatch;
  });

  // Get best performance per athlete for their most recent testing date
  const getBestPerformancePerAthlete = () => {
    // Step 1: Find the most recent test date per athlete
    const athleteMostRecentDate: Record<string, string> = {};
    
    filteredData.forEach(test => {
      if (getFullTestName(test.test_name) === currentTestName) {
        const key = `${test.athlete_name}_${test.test_name}`;
        if (!athleteMostRecentDate[key] || test.test_date > athleteMostRecentDate[key]) {
          athleteMostRecentDate[key] = test.test_date;
        }
      }
    });

    // Step 2: Among all reps on the most recent date, pick the best value
    const athleteBestOnDate: Record<string, TestData> = {};
    
    filteredData.forEach(test => {
      if (getFullTestName(test.test_name) !== currentTestName) return;
      const key = `${test.athlete_name}_${test.test_name}`;
      if (test.test_date !== athleteMostRecentDate[key]) return;

      if (!athleteBestOnDate[key]) {
        athleteBestOnDate[key] = test;
      } else {
        // Compare using the currently selected metric - pick the higher value
        const currentMetric = selectedMetricType;
        const existingVal = (athleteBestOnDate[key].metrics as any)?.[currentMetric];
        const newVal = (test.metrics as any)?.[currentMetric];
        if (typeof newVal === 'number' && (typeof existingVal !== 'number' || newVal > existingVal)) {
          athleteBestOnDate[key] = test;
        }
      }
    });

    return Object.values(athleteBestOnDate);
  };

  // Fetch athlete avatars
  useEffect(() => {
    const fetchAvatars = async () => {
      const athleteNames = [...new Set(data.map(d => d.athlete_name))];
      const { data: athletes, error } = await supabase
        .from('athletes')
        .select('name, avatar_url')
        .in('name', athleteNames);
      
      if (!error && athletes) {
        const avatarMap: Record<string, string> = {};
        athletes.forEach(athlete => {
          if (athlete.avatar_url) {
            avatarMap[athlete.name] = athlete.avatar_url;
          }
        });
        setAthleteAvatars(avatarMap);
      }
    };

    if (data.length > 0) {
      fetchAvatars();
    }
  }, [data]);

  // Debug filtered data
  useEffect(() => {
    console.log('LiveDataSection - Filtered data:', {
      filteredLength: filteredData.length,
      currentTestName,
      availableMetrics,
      selectedMetricType
    });
  }, [filteredData, currentTestName, selectedMetricType]);

  const bestPerformances = getBestPerformancePerAthlete();

  // Generate chart data for best performances
  const chartData = bestPerformances.map(test => {
    // Convert internal metric key to display name for metricCaseLogic
    const metricDisplayName = getMetricDisplayNameForLogic(selectedMetricType);
    const { value } = metricCaseLogic(test, getFullTestName(test.test_name), metricDisplayName);
    
    console.log('Chart data for athlete:', {
      athlete: test.athlete_name,
      test_name: test.test_name,
      selectedMetricType,
      metricDisplayName,
      value,
      metrics: test.metrics
    });
    return {
      name: test.athlete_name.length > 12 ? test.athlete_name.substring(0, 12) + '...' : test.athlete_name,
      fullName: test.athlete_name,
      value: value || 0,
      team: test.team_name,
      testDate: test.test_date,
      testName: test.test_name,
      avatarUrl: athleteAvatars[test.athlete_name] || null
    };
  }).sort((a, b) => b.value - a.value);

  // Only show top 5 performers, mark others as blurred
  const chartDataWithBlur = chartData.map((item, index) => ({
    ...item,
    isBlurred: index >= 5
  }));

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
  
  const bandAreas = [
    {
      name: "Elite",
      color: branding?.primary_color ? `${branding.primary_color}20` : "#bbf7d0",
      from: maxValue * 0.9,
      to: maxValue,
    },
    {
      name: "Good",
      color: branding?.secondary_color ? `${branding.secondary_color}20` : "#fde68a",
      from: maxValue * 0.75,
      to: maxValue * 0.9,
    },
    {
      name: "Developing",
      color: branding?.accent_color ? `${branding.accent_color}20` : "#fed7aa",
      from: maxValue * 0.5,
      to: maxValue * 0.75,
    },
  ];

  // Get unique sex values from data
  const availableSex = [...new Set(data.map(d => d.gender).filter(Boolean))];

  // Calculate KPIs based on current test and metric (same as chart)
  const currentTestData = filteredData.filter(d => getFullTestName(d.test_name) === currentTestName);
  
  // Total tests in last 24 hours only
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const totalTests = currentTestData.filter(d => new Date(d.test_date) >= twentyFourHoursAgo).length;
  
  const uniqueAthletes = new Set(currentTestData.map(d => d.athlete_name)).size;
  const avgMetricValue = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length 
    : 0;
  const topPerformer = chartData.length > 0 ? chartData[0] : null;

  const metricDisplayName = getMetricDisplayNameForLogic(selectedMetricType);
  const { yAxisLabel } = metricCaseLogic(data[0], getFullTestName(data[0]?.test_name || ""), metricDisplayName);

  return (
    <div 
      className="space-y-6"
      style={branding ? { fontFamily: branding.font_family || 'Inter, system-ui, sans-serif' } : {}}
    >
      {/* Header with Live indicator and Current Test */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity 
            className="h-6 w-6" 
            style={{ color: branding?.primary_color || 'hsl(var(--primary))' }}
          />
          <h2 
            className="text-2xl font-bold"
            style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
          >
            Live Data Dashboard
          </h2>
          <Badge 
            variant="secondary" 
            className="animate-pulse"
            style={{ 
              backgroundColor: branding?.accent_color ? `${branding.accent_color}20` : 'hsl(var(--secondary))',
              color: branding?.accent_color || 'hsl(var(--secondary-foreground))'
            }}
          >
            LIVE
          </Badge>
        </div>

        {/* Current Test Window */}
        <Card 
          className="border-2 bg-gradient-to-r from-background to-muted/20"
          style={{ borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))' }}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock 
                className="h-4 w-4"
                style={{ color: branding?.secondary_color || 'hsl(var(--secondary-foreground))' }}
              />
              <div>
                <p className="text-xs text-muted-foreground">Current Test</p>
                <p 
                  className="text-sm font-semibold"
                  style={{ color: branding?.secondary_color || 'hsl(var(--foreground))' }}
                >
                  {currentTestName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Comparative Data Filters */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/50 flex-1">
          <div className="flex items-center gap-2 mr-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comparative</span>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Sport</label>
            <Select value={filterSport} onValueChange={(v) => { setFilterSport(v); setFilterAgeGroup(""); setFilterWeightCategory(""); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent>
                {eliteFilterOptions.sports.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Age Group</label>
            <Select value={filterAgeGroup} onValueChange={(v) => { setFilterAgeGroup(v); setFilterWeightCategory(""); }} disabled={eliteFilterOptions.ageGroups.length === 0}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Ages" />
              </SelectTrigger>
              <SelectContent>
                {eliteFilterOptions.ageGroups.map(a => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Weight Category</label>
            <Select value={filterWeightCategory} onValueChange={setFilterWeightCategory} disabled={eliteFilterOptions.weightCategories.length === 0}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Weights" />
              </SelectTrigger>
              <SelectContent>
                {eliteFilterOptions.weightCategories.map(w => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(filterSport || filterAgeGroup || filterWeightCategory) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterSport(""); setFilterAgeGroup(""); setFilterWeightCategory(""); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Existing filters */}
        <div className="flex gap-3">
          <Select value={selectedSex} onValueChange={setSelectedSex}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {availableSex.map(sex => (
                <SelectItem key={sex} value={sex}>
                  {sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : sex}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedMetricType} onValueChange={setSelectedMetricType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Metric Type" />
            </SelectTrigger>
            <SelectContent>
              {availableMetrics.map(metric => {
                const metricValue = (() => {
                  switch(metric) {
                    case "Jump Height (cm)": return "jump_height_ft";
                    case "Peak Power": return "peak_power";
                    case "Relative Peak Power": return "relative_peak_power";
                    case "Contact Time": return "contact_time";
                    case "Reactive Strength Index": return "rsi";
                    case "Flight Time": return "flight_time";
                    case "Power": return "peak_power";
                    case "Take-off Velocity": return "peak_velocity";
                    case "Average Rate of Force Development": return "avg_rfd";
                    case "Average Propulsive Power": return "avg_propulsive_power";
                    default: return "jump_height_ft";
                  }
                })();
                return (
                  <SelectItem key={metricValue} value={metricValue}>
                    {metric}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparative Percentile Chart */}
      {filteredEliteData.length > 0 && (filterSport || filterAgeGroup || filterWeightCategory) && (() => {
        // Build the dynamic_metrics key based on current test + metric
        const metricDisplayName2 = getMetricDisplayName(selectedMetricType);
        const dynamicMetricKey = `${currentTestName}-${metricDisplayName2}`;
        
        // Map selected metric to static elite data columns (fallback)
        const metricToEliteColumn: Record<string, string> = {
          'jump_height_ft': 'CMJ Jump Height (cm)',
          'peak_power': 'CMJ Peak Power (W)',
          'relative_peak_power': 'CMJ Relative Peak Power (W/kg)',
          'rsi': 'CMJ Reactive Strength Index',
        };
        
        const eliteColumn = metricToEliteColumn[selectedMetricType];
        
        // Calculate elite benchmark — prioritize dynamic_metrics over static columns
        let eliteBenchmark = 0;
        
        // First: try dynamic_metrics (user-entered data)
        const dynamicValues = filteredEliteData
          .map(d => {
            const dm = (d as any).dynamic_metrics;
            if (!dm || typeof dm !== 'object') return 0;
            // Exact key match first
            if (dm[dynamicMetricKey] !== undefined) return Number(dm[dynamicMetricKey]);
            // Fallback: try matching keys loosely
            for (const key of Object.keys(dm)) {
              if (key === dynamicMetricKey) return Number(dm[key]);
            }
            return 0;
          })
          .filter(v => v > 0 && !isNaN(v));
        
        if (dynamicValues.length > 0) {
          eliteBenchmark = dynamicValues.reduce((a, b) => a + b, 0) / dynamicValues.length;
        } else if (eliteColumn) {
          // Fallback: use static column
          const eliteValues = filteredEliteData
            .map(d => Number((d as any)[eliteColumn]))
            .filter(v => v > 0 && !isNaN(v));
          if (eliteValues.length > 0) {
            eliteBenchmark = eliteValues.reduce((a, b) => a + b, 0) / eliteValues.length;
          }
        }

        if (eliteBenchmark <= 0 || chartData.length === 0) return null;

        // Build percentile data for each live athlete
        const percentileData = chartData.map(athlete => {
          const percentage = (athlete.value / eliteBenchmark) * 100;
          let band: string;
          let color: string;
          if (percentage >= 90) {
            band = 'Elite (90%+)';
            color = '#22c55e'; // green
          } else if (percentage >= 75) {
            band = 'Good (75-90%)';
            color = '#eab308'; // yellow
          } else {
            band = 'Below (<75%)';
            color = '#ef4444'; // red
          }
          return {
            name: athlete.name,
            fullName: athlete.fullName,
            percentage: Math.round(percentage * 10) / 10,
            value: athlete.value,
            band,
            color,
            avatarUrl: athlete.avatarUrl,
          };
        });

        return (
          <Card
            className="border-2"
            style={{ borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))' }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span style={{ color: branding?.secondary_color || 'hsl(var(--foreground))' }}>
                  Athlete vs Elite Benchmark — {getMetricDisplayName(selectedMetricType)}
                  {filterSport && <Badge variant="secondary" className="ml-2">{filterSport}</Badge>}
                  {filterAgeGroup && <Badge variant="secondary" className="ml-1">Age: {filterAgeGroup}</Badge>}
                  {filterWeightCategory && <Badge variant="secondary" className="ml-1">{filterWeightCategory}</Badge>}
                </span>
                <span className="text-xs text-muted-foreground">
                  Elite Avg: {eliteBenchmark.toFixed(1)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex gap-4 mb-4 items-center justify-center text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#22c55e' }} /> Elite (90%+)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#eab308' }} /> Good (75-90%)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#ef4444' }} /> Below (&lt;75%)</span>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={percentileData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    barCategoryGap="20%"
                  >
                    <ReferenceArea y1={90} y2={Math.max(100, ...percentileData.map(d => d.percentage))} fill="#22c55e" fillOpacity={0.1} stroke="none" />
                    <ReferenceArea y1={75} y2={90} fill="#eab308" fillOpacity={0.1} stroke="none" />
                    <ReferenceArea y1={0} y2={75} fill="#ef4444" fillOpacity={0.08} stroke="none" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={65}
                    />
                    <YAxis
                      tick={{ fontSize: 13 }}
                      domain={[0, (dataMax: number) => Math.max(110, Math.ceil(dataMax / 10) * 10 + 10)]}
                      label={{
                        value: '% of Elite Benchmark',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: 13 },
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ borderRadius: 8, backgroundColor: '#fff', border: `2px solid ${branding?.primary_color || 'hsl(var(--border))'}` }}
                      formatter={(value: any, name: any, props: any) => [
                        `${props.payload.percentage}% (${props.payload.value.toFixed(2)})`,
                        props.payload.band,
                      ]}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                      {percentileData.map((entry, index) => (
                        <Cell key={`pct-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="percentage"
                        position="top"
                        formatter={(v: number) => `${v}%`}
                        style={{ fontSize: 11, fontWeight: 600, fill: '#374151' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="border-2"
          style={{ borderColor: branding?.primary_color ? `${branding.primary_color}40` : 'hsl(var(--border))' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: branding?.primary_color ? `${branding.primary_color}20` : 'hsl(var(--primary)/0.1)' }}
              >
                <Activity 
                  className="h-5 w-5"
                  style={{ color: branding?.primary_color || 'hsl(var(--primary))' }}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2"
          style={{ borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: branding?.secondary_color ? `${branding.secondary_color}20` : 'hsl(var(--secondary)/0.1)' }}
              >
                <Users 
                  className="h-5 w-5"
                  style={{ color: branding?.secondary_color || 'hsl(var(--secondary-foreground))' }}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Athletes</p>
                <p className="text-2xl font-bold">{uniqueAthletes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2"
          style={{ borderColor: branding?.accent_color ? `${branding.accent_color}40` : 'hsl(var(--border))' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: branding?.accent_color ? `${branding.accent_color}20` : 'hsl(var(--accent)/0.1)' }}
              >
                <Target 
                  className="h-5 w-5"
                  style={{ color: branding?.accent_color || 'hsl(var(--accent-foreground))' }}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg {getMetricDisplayName(selectedMetricType)}</p>
                <p className="text-2xl font-bold">{avgMetricValue.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-2"
          style={{ borderColor: branding?.primary_color ? `${branding.primary_color}40` : 'hsl(var(--border))' }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: branding?.primary_color ? `${branding.primary_color}20` : 'hsl(var(--primary)/0.1)' }}
              >
                <TrendingUp 
                  className="h-5 w-5"
                  style={{ color: branding?.primary_color || 'hsl(var(--primary))' }}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold">{topPerformer?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Chart */}
      <Card 
        ref={chartCardRef}
        className="border-2 relative"
        style={{ borderColor: branding?.primary_color ? `${branding.primary_color}40` : 'hsl(var(--border))' }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <CardTitle 
                className="text-xl"
                style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
              >
                Best Performers - {currentTestName} - {getMetricDisplayName(selectedMetricType).toUpperCase()}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="absolute right-4 top-4"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={isFullscreen ? "h-[calc(100vh-120px)]" : ""}>
          <div className={isFullscreen ? "h-full w-full" : "h-[500px] w-full"}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataWithBlur}
                margin={{
                  top: 28,
                  right: 30,
                  left: 20,
                  bottom: 70,
                }}
                barCategoryGap="20%"
              >
                {/* Performance bands */}
                {maxValue > 0 &&
                  bandAreas.map(band => (
                    <ReferenceArea
                      key={band.name}
                      y1={band.from}
                      y2={band.to}
                      fill={band.color}
                      fillOpacity={0.3}
                      stroke="none"
                    />
                  ))
                }
                <XAxis
                  dataKey="name"
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const dataPoint = chartDataWithBlur.find(d => d.name === payload.value);
                    const isBlurred = dataPoint?.isBlurred;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="end"
                          fill={isBlurred ? "#ccc" : "#666"}
                          fontSize={12}
                          transform="rotate(-45)"
                          style={{ filter: isBlurred ? 'blur(2px)' : 'none' }}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                  height={65}
                />
                <YAxis
                  tick={{ fontSize: 13 }}
                  label={{
                    value: getMetricDisplayName(selectedMetricType),
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: 14 },
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                  contentStyle={{ 
                    borderRadius: 8, 
                    backgroundColor: "#fff",
                    border: `2px solid ${branding?.primary_color || 'hsl(var(--border))'}`
                  }}
                  formatter={(value: any) => [
                    `${value.toFixed(2)}`,
                    `${getMetricDisplayName(selectedMetricType)}`
                  ]}
                  labelFormatter={(label: any, payload: any) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return `${data.fullName} (${data.team})`;
                    }
                    return label;
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  name={selectedMetricType}
                >
                  {chartDataWithBlur.map((entry, index) => {
                    let fillColor = branding?.primary_color || "#374151";
                    
                    // Top 3 get medal colors
                    if (!entry.isBlurred) {
                      if (index === 0) fillColor = "#FFD700"; // Gold
                      else if (index === 1) fillColor = "#C0C0C0"; // Silver
                      else if (index === 2) fillColor = "#CD7F32"; // Bronze
                    }
                    
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillColor}
                        opacity={entry.isBlurred ? 0.2 : 1}
                        style={{ filter: entry.isBlurred ? 'blur(3px)' : 'none' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="value"
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, value, index } = props;
                      const entry = chartDataWithBlur[index];
                      if (!entry?.avatarUrl || entry.isBlurred) return null;
                      
                      const centerX = x + width / 2;
                      const avatarSize = 40;
                      
                      return (
                        <g>
                          <foreignObject
                            x={centerX - avatarSize / 2}
                            y={y - avatarSize - 8}
                            width={avatarSize}
                            height={avatarSize}
                          >
                            <div className="flex items-center justify-center">
                              <img
                                src={entry.avatarUrl}
                                alt={entry.fullName}
                                className="w-10 h-10 rounded-full border-2 object-cover"
                                style={{ borderColor: branding?.primary_color || '#374151' }}
                              />
                            </div>
                          </foreignObject>
                        </g>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};