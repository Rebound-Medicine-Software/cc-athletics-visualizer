import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { Activity, Users, Target, TrendingUp } from "lucide-react";
import { metricCaseLogic } from "./chart/useMetricCaseLogic";

interface LiveDataSectionProps {
  data: TestData[];
  selectedTeams: string[];
  branding?: any;
}

export const LiveDataSection = ({ data, selectedTeams, branding }: LiveDataSectionProps) => {
  const [selectedSex, setSelectedSex] = useState<string>("all");
  const [selectedMetricType, setSelectedMetricType] = useState<string>("peak_force");
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter data based on selected teams and sex
  const filteredData = data.filter(d => {
    const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(d.team_name);
    const sexMatch = selectedSex === "all" || d.gender === selectedSex;
    return teamMatch && sexMatch;
  });

  // Get latest athlete tested per team
  const getLatestAthletePerTeam = () => {
    const teamMap: Record<string, TestData> = {};
    
    filteredData.forEach(test => {
      const existing = teamMap[test.team_name];
      if (!existing || new Date(test.test_date) > new Date(existing.test_date)) {
        teamMap[test.team_name] = test;
      }
    });

    return Object.values(teamMap);
  };

  const latestAthletes = getLatestAthletePerTeam();

  // Generate chart data for latest athletes
  const chartData = latestAthletes.map(test => {
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
      {/* Header with Live indicator */}
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
        
        {/* Filters */}
        <div className="flex gap-4">
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
              <SelectItem value="peak_force">Peak Force</SelectItem>
              <SelectItem value="peak_power">Peak Power</SelectItem>
              <SelectItem value="jump_height_ft">Jump Height</SelectItem>
              <SelectItem value="rsi">RSI</SelectItem>
              <SelectItem value="contact_time">Contact Time</SelectItem>
              <SelectItem value="flight_time">Flight Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                <p className="text-sm text-muted-foreground">Avg {selectedMetricType.replace('_', ' ')}</p>
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
            Latest Athletes by Team - {selectedMetricType.replace('_', ' ').toUpperCase()}
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
                    value: yAxisLabel || selectedMetricType,
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
                  formatter={(value: any, name: any, props: any) => [
                    `${value.toFixed(2)}`,
                    `${selectedMetricType.replace('_', ' ')}`
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