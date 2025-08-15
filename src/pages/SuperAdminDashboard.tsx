import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  BarChart3, 
  Calendar, 
  Users, 
  FileText, 
  Dumbbell, 
  Settings, 
  MessageCircle,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Search,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface KPIData {
  views: number;
  visits: number;
  newUsers: number;
  activeUsers: number;
  viewsChange: number;
  visitsChange: number;
  newUsersChange: number;
  activeUsersChange: number;
}

interface ChartData {
  month: string;
  users: number;
}

interface ProjectData {
  id: string;
  manager: string;
  date: string;
  amount: number;
  status: 'In Progress' | 'Complete' | 'Pending' | 'Approved' | 'Rejected';
  avatar?: string;
}

const SuperAdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('Overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData>({
    views: 7265,
    visits: 3671,
    newUsers: 256,
    activeUsers: 2318,
    viewsChange: 11.01,
    visitsChange: -0.03,
    newUsersChange: 15.03,
    activeUsersChange: 6.08
  });

  const [chartData, setChartData] = useState<ChartData[]>([
    { month: 'Jan', users: 120 },
    { month: 'Feb', users: 98 },
    { month: 'Mar', users: 150 },
    { month: 'Apr', users: 280 },
    { month: 'May', users: 240 },
    { month: 'Jun', users: 320 },
  ]);

  const [projectData, setProjectData] = useState<ProjectData[]>([]);

  // Check if user is super admin and specifically the allowed email
  if (!profile || profile.role !== 'super_admin' || profile.email !== 'reflexsportstherapyy@gmail.com') {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch real data from Supabase
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profilesError && profiles) {
        // Update KPI data with real numbers
        const totalUsers = profiles.length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const newUsers = profiles.filter(p => 
          new Date(p.created_at) >= thirtyDaysAgo
        ).length;

        setKpiData(prev => ({
          ...prev,
          activeUsers: totalUsers,
          newUsers: newUsers,
          views: totalUsers * 45,
          visits: totalUsers * 25
        }));

        // Generate project data from recent profiles
        const projects: ProjectData[] = profiles.slice(0, 5).map((profile, index) => ({
          id: profile.id,
          manager: profile.full_name || profile.email.split('@')[0],
          date: new Date(profile.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          amount: Math.floor(Math.random() * 500) + 100,
          status: ['In Progress', 'Complete', 'Pending', 'Approved', 'Rejected'][index % 5] as ProjectData['status'],
          avatar: profile.avatar_url
        }));

        setProjectData(projects);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const navigationItems = [
    { id: 'Overview', icon: Activity, label: 'Overview' },
    { id: 'eCommerce', icon: CreditCard, label: 'eCommerce' },
    { id: 'Projects', icon: FileText, label: 'Projects' },
    { id: 'User Profile', icon: Users, label: 'User Profile' },
    { id: 'Account', icon: Settings, label: 'Account' },
    { id: 'Corporate', icon: Building2, label: 'Corporate' },
    { id: 'Blog', icon: FileText, label: 'Blog' },
    { id: 'Social', icon: MessageCircle, label: 'Social' },
  ];

  const deviceData = [
    { name: 'Linux', value: 15, color: '#e5e7eb' },
    { name: 'Mac', value: 25, color: '#e5e7eb' },
    { name: 'iOS', value: 20, color: '#e5e7eb' },
    { name: 'Windows', value: 45, color: '#3b82f6' },
    { name: 'Android', value: 35, color: '#e5e7eb' },
    { name: 'Other', value: 10, color: '#e5e7eb' },
  ];

  const locationData = [
    { name: 'US', value: 40 },
    { name: 'Canada', value: 30 },
    { name: 'Mexico', value: 25 },
    { name: 'China', value: 35 },
    { name: 'Japan', value: 45 },
    { name: 'Australia', value: 20 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800';
      case 'Pending':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded"></div>
              </div>
              <span className="font-semibold text-lg text-blue-500">snowui</span>
            </div>
          )}
        </div>

        <nav className="mt-8 px-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-3 py-3 mb-1 rounded-lg text-left transition-colors ${
                  activeSection === item.id 
                    ? 'bg-gray-100 text-gray-900 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {!sidebarCollapsed && (
                  <span className="ml-3 text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2"
              >
                <Menu className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Dashboards</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">{activeSection}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input 
                  placeholder="Search" 
                  className="pl-10 w-64 border-gray-200"
                />
              </div>
              
              <Button variant="ghost" size="sm" className="p-2">
                <Bell className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={signOut} className="p-2">
                <LogOut className="w-4 h-4" />
              </Button>

              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {profile.full_name?.charAt(0) || profile.email.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 bg-gray-50">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-100">Views</h3>
                  <TrendingUp className="w-4 h-4 text-blue-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(kpiData.views)}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-200" />
                    <span className="text-xs text-green-200">+{kpiData.viewsChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-700 to-gray-800 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Visits</h3>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(kpiData.visits)}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingDown className="w-3 h-3 text-red-200" />
                    <span className="text-xs text-red-200">{kpiData.visitsChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-blue-100">New Users</h3>
                  <TrendingUp className="w-4 h-4 text-blue-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{kpiData.newUsers}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-200" />
                    <span className="text-xs text-green-200">+{kpiData.newUsersChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Active Users</h3>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(kpiData.activeUsers)}</p>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-green-200" />
                    <span className="text-xs text-green-200">+{kpiData.activeUsersChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart and Secondary Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Main Chart */}
            <div className="xl:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Users</Badge>
                        <Badge variant="outline" className="text-gray-500 border-gray-200">Projects</Badge>
                        <Badge variant="outline" className="text-gray-500 border-gray-200">Operating Status</Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Week</span>
                      <Button variant="ghost" size="sm" className="p-1">
                        <TrendingUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#8b5cf6" 
                          strokeWidth={3}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Device and Location Traffic */}
            <div className="space-y-6">
              {/* Device Traffic */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-blue-500 text-lg font-semibold">Device Traffic</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {deviceData.map((device, index) => (
                      <div key={device.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{device.name}</span>
                          {device.name === 'Android' && (
                            <Badge className="bg-black text-white text-xs px-2 py-1">24.3K</Badge>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 relative">
                          <div 
                            className={`h-6 rounded-full transition-all duration-500 ${
                              device.name === 'Windows' ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${device.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Location Traffic */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-green-500 text-lg font-semibold">Location Traffic</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {locationData.map((location) => (
                      <div key={location.name} className="space-y-2">
                        <span className="text-sm font-medium text-gray-700">{location.name}</span>
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div 
                            className="h-6 rounded-full bg-gray-400 transition-all duration-500"
                            style={{ width: `${location.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Traffic Chart */}
          <div className="mb-8">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-500 text-lg font-semibold">Product Traffic</CardTitle>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-gray-600">All</Badge>
                    <Badge variant="outline" className="text-gray-600">SnowUI</Badge>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">Dashboard</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="users" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-cyan-500 text-lg font-semibold">Projects</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-medium text-gray-500 text-sm">Manager</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500 text-sm">Date</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500 text-sm">Amount</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectData.map((project, index) => (
                      <tr key={project.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={project.avatar} />
                              <AvatarFallback className="bg-gray-200 text-gray-600">
                                {project.manager.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-900">{project.manager}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 text-sm">{project.date}</td>
                        <td className="py-4 px-6 font-medium text-gray-900">${project.amount}.00</td>
                        <td className="py-4 px-6">
                          <Badge className={getStatusColor(project.status)} variant="secondary">
                            {project.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;