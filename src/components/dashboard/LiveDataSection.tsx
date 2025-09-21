import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea } from "recharts";
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
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get the most recent test being conducted
  const getMostRecentTest = () => {
    if (!data || data.length === 0) return null;
    return data.reduce((latest, current) => 
      new Date(current.test_date) > new Date(latest.test_date) ? current : latest
    );
  };

  const mostRecentTest = getMostRecentTest();
  const currentTestName = mostRecentTest?.test_name || "Countermovement Jump";

  // Get available metrics for current test
  const availableMetrics = getMetricTypesForTest(currentTestName);

  // Mapping for display names
  const getMetricDisplayName = (metricValue: string): string => {
    const displayMap: Record<string, string> = {
      "jump_height_ft": "Jump Height",
      "peak_power": "Peak Power",
      "contact_time": "Contact Time",
      "rsi": "Reactive Strength Index",
      "flight_time": "Flight Time",
      "peak_velocity": "Take-off Velocity",
      "avg_rfd": "Average Rate of Force Development",
      "avg_propulsive_power": "Average Propulsive Power"
    };
    return displayMap[metricValue] || metricValue.replace('_', ' ');
  };

  // Auto-update metric type when test changes
  useEffect(() => {
    if (availableMetrics.length > 0) {
      const metricMap: Record<string, string> = {
        "Jump Height (cm)": "jump_height_ft",
        "Peak Power": "peak_power", 
        "Relative Peak Power": "peak_power",
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
    return teamMatch && sexMatch;
  });

  // Get best performance per athlete per test type
  const getBestPerformancePerAthlete = () => {
    const athleteMap: Record<string, TestData> = {};
    
    filteredData.forEach(test => {
      if (test.test_name === currentTestName) {
        const key = `${test.athlete_name}_${test.test_name}`;
        const { value } = metricCaseLogic(test, test.test_name, selectedMetricType);
        
        if (!athleteMap[key] || value > metricCaseLogic(athleteMap[key], athleteMap[key].test_name, selectedMetricType).value) {
          athleteMap[key] = test;
        }
      }
    });

    return Object.values(athleteMap);
  };

  const bestPerformances = getBestPerformancePerAthlete();

  // Generate chart data for best performances
  const chartData = bestPerformances.map(test => {
    const { value } = metricCaseLogic(test, test.test_name, selectedMetricType);
    return {
      name: test.athlete_name.length > 12 ? test.athlete_name.substring(0, 12) + '...' : test.athlete_name,
      fullName: test.athlete_name,
      value: value || 0,
      team: test.team_name,
      testDate: test.test_date,
      testName: test.test_name
    };
  }).sort((a, b) => b.value - a.value);

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

  // Calculate KPIs
  const totalTests = filteredData.length;
  const uniqueAthletes = new Set(filteredData.map(d => d.athlete_name)).size;
  const avgMetricValue = chartData.length > 0 
    ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length 
    : 0;
  const topPerformer = chartData.length > 0 ? chartData[0] : null;

  const { yAxisLabel } = metricCaseLogic(data[0], data[0]?.test_name, selectedMetricType);

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
              <SelectItem key={sex} value={sex}>{sex}</SelectItem>
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
                  case "Relative Peak Power": return "peak_power";
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
                data={chartData}
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
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={65}
                />
                <YAxis
                  tick={{ fontSize: 13 }}
                  label={{
                    value: yAxisLabel || getMetricDisplayName(selectedMetricType),
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
                  fill={branding?.primary_color || "#374151"}
                  radius={[6, 6, 0, 0]}
                  name={selectedMetricType}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};