import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const userSignupData = [
  { month: 'Jan', users: 245 },
  { month: 'Feb', users: 188 },
  { month: 'Mar', users: 352 },
  { month: 'Apr', users: 498 },
  { month: 'May', users: 421 },
  { month: 'Jun', users: 567 },
];

const deviceData = [
  { name: 'Linux', value: 15 },
  { name: 'Mac', value: 25 },
  { name: 'iOS', value: 20 },
  { name: 'Windows', value: 18 },
  { name: 'Android', value: 243 },
  { name: 'Other', value: 12 },
];

const locationData = [
  { name: 'US', value: 45 },
  { name: 'Canada', value: 25 },
  { name: 'Mexico', value: 15 },
  { name: 'China', value: 8 },
  { name: 'Japan', value: 5 },
  { name: 'Australia', value: 2 },
];

const productTrafficData = [
  { month: 'Jan', all: 120, snowui: 80, dashboard: 60 },
  { month: 'Feb', all: 140, snowui: 95, dashboard: 70 },
  { month: 'Mar', all: 180, snowui: 120, dashboard: 90 },
  { month: 'Apr', all: 200, snowui: 140, dashboard: 110 },
  { month: 'May', all: 220, snowui: 160, dashboard: 130 },
  { month: 'Jun', all: 250, snowui: 180, dashboard: 150 },
  { month: 'Jul', all: 180, snowui: 130, dashboard: 100 },
  { month: 'Aug', all: 190, snowui: 140, dashboard: 110 },
  { month: 'Sep', all: 210, snowui: 150, dashboard: 120 },
  { month: 'Oct', all: 240, snowui: 170, dashboard: 140 },
  { month: 'Nov', all: 260, snowui: 190, dashboard: 160 },
  { month: 'Dec', all: 280, snowui: 200, dashboard: 180 },
];

export const DashboardCharts = () => {
  return (
    <div className="space-y-6">
      {/* Main User Growth Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>Monthly user signups over time</CardDescription>
            </div>
            <Tabs defaultValue="users" className="w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="status">Operating Status</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userSignupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Traffic Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Device Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Location Traffic Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-success">Location Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Product Traffic Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Product Traffic</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>All</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
                <span>SnowUI</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Dashboard</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productTrafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="all" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="snowui" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="dashboard" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};