import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea, Cell } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { Activity, Users, Target, TrendingUp, Clock } from "lucide-react";
import { metricCaseLogic } from "./chart/useMetricCaseLogic";
import { getMetricTypesForTest } from "./filters/filterUtils";

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

  // Get best performance per athlete per test type (or most recent)
  const getBestPerformancePerAthlete = () => {
    const athleteMap: Record<string, TestData> = {};
    
    filteredData.forEach(test => {
      if (getFullTestName(test.test_name) === currentTestName) {
        const key = `${test.athlete_name}_${test.test_name}`;
        
        // Get most recent test for each athlete (instead of best performance)
        if (!athleteMap[key] || new Date(test.test_date) > new Date(athleteMap[key].test_date)) {
          athleteMap[key] = test;
        }
      }
    });

    return Object.values(athleteMap);
  };

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
      testName: test.test_name
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
      <div className="flex gap-4 justify-end">
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
        className="border-2"
        style={{ borderColor: branding?.primary_color ? `${branding.primary_color}40` : 'hsl(var(--border))' }}
      >
        <CardHeader>
          <CardTitle 
            className="text-center text-xl"
            style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
          >
            Best Performers - {currentTestName} - {getMetricDisplayName(selectedMetricType).toUpperCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full">
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
                  {chartDataWithBlur.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={branding?.primary_color || "#374151"}
                      opacity={entry.isBlurred ? 0.2 : 1}
                      style={{ filter: entry.isBlurred ? 'blur(3px)' : 'none' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};