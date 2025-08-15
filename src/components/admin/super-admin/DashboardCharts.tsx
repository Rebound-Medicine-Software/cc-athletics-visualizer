import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChartData {
  month: string;
  users: number;
  revenue: number;
}

interface DeviceData {
  device: string;
  value: number;
  percentage: number;
}

interface LocationData {
  location: string;
  value: number;
  percentage: number;
}

export const DashboardCharts: React.FC = () => {
  const [userGrowthData, setUserGrowthData] = useState<ChartData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);

  useEffect(() => {
    // Mock data for charts (in real app, this would come from analytics)
    setUserGrowthData([
      { month: 'Jan', users: 120, revenue: 12000 },
      { month: 'Feb', users: 98, revenue: 9800 },
      { month: 'Mar', users: 150, revenue: 15000 },
      { month: 'Apr', users: 280, revenue: 28000 },
      { month: 'May', users: 240, revenue: 24000 },
      { month: 'Jun', users: 320, revenue: 32000 },
    ]);

    setDeviceData([
      { device: 'Desktop', value: 2100, percentage: 45 },
      { device: 'Mobile', value: 1800, percentage: 39 },
      { device: 'Tablet', value: 750, percentage: 16 },
    ]);

    setLocationData([
      { location: 'United States', value: 1200, percentage: 35 },
      { location: 'Canada', value: 800, percentage: 23 },
      { location: 'United Kingdom', value: 600, percentage: 17 },
      { location: 'Australia', value: 450, percentage: 13 },
      { location: 'Other', value: 400, percentage: 12 },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Growth Over Time</CardTitle>
            <Tabs defaultValue="users" className="w-auto">
              <TabsList>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'users' ? `${value} users` : `$${value}`,
                    name === 'users' ? 'New Users' : 'Revenue'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Traffic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Device Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceData.map((item, index) => (
                <div key={item.device} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.device}</span>
                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        index === 0 ? 'bg-primary' : 
                        index === 1 ? 'bg-blue-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{item.value} visits</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location Traffic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Location Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationData.map((item, index) => (
                <div key={item.location} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.location}</span>
                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{item.value} visits</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Traffic Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-500">Monthly Activity</CardTitle>
            <div className="flex space-x-2">
              <Badge variant="outline">All</Badge>
              <Badge variant="outline">Dashboard</Badge>
              <Badge variant="outline">Analytics</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="hsl(var(--primary))" />
                <Bar dataKey="revenue" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};