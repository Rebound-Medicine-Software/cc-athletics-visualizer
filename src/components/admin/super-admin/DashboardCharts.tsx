import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const signupData = [
  { month: 'Jan', users: 65, therapists: 12 },
  { month: 'Feb', users: 89, therapists: 18 },
  { month: 'Mar', users: 145, therapists: 25 },
  { month: 'Apr', users: 198, therapists: 32 },
  { month: 'May', users: 234, therapists: 41 },
  { month: 'Jun', users: 267, therapists: 47 },
];

const deviceData = [
  { name: 'Desktop', value: 58, color: 'hsl(var(--primary))' },
  { name: 'Mobile', value: 32, color: 'hsl(var(--success))' },
  { name: 'Tablet', value: 10, color: 'hsl(var(--warning))' },
];

const regionData = [
  { region: 'North America', users: 45, growth: 12 },
  { region: 'Europe', users: 32, growth: 8 },
  { region: 'Asia Pacific', users: 18, growth: 25 },
  { region: 'Other', users: 5, growth: 5 },
];

export const DashboardCharts: React.FC = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* User Signups Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>User Growth Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={signupData}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="therapistGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="users"
                stackId="1"
                stroke="hsl(var(--primary))"
                fill="url(#userGradient)"
                name="Total Users"
              />
              <Area
                type="monotone"
                dataKey="therapists"
                stackId="1"
                stroke="hsl(var(--success))"
                fill="url(#therapistGradient)"
                name="Therapists"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Device Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Device Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Regional Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regionData.map((region) => (
              <div key={region.region} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{region.region}</span>
                    <span className="text-sm text-muted-foreground">{region.users}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${region.users}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-xs text-success">
                  +{region.growth}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};