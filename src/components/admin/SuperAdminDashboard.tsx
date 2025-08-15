import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { EnhancedDashboardOverview } from './super-admin/EnhancedDashboardOverview';
import { UserManagement } from './super-admin/UserManagement';
import { TeamManagement } from './super-admin/TeamManagement';
import { PaymentManagement } from './super-admin/PaymentManagement';
import { SupportCenter } from './super-admin/SupportCenter';
import { AdminHeader } from './AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  MessageCircle,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Search,
  Bell,
  LogOut,
  Menu,
  MoreHorizontal
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const SuperAdminDashboard = () => {
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profilesError && profiles) {
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
    { name: 'Linux', value: 15 },
    { name: 'Mac', value: 25 },
    { name: 'iOS', value: 20 },
    { name: 'Windows', value: 45 },
    { name: 'Android', value: 35 },
    { name: 'Other', value: 10 },
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
        return 'bg-success/10 text-success';
      case 'In Progress':
        return 'bg-primary/10 text-primary';
      case 'Pending':
        return 'bg-warning/10 text-warning';
      case 'Approved':
        return 'bg-team-accent/10 text-team-accent';
      case 'Rejected':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`bg-card border-r border-border transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded"></div>
              </div>
              <span className="font-semibold text-lg text-primary">snowui</span>
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
                    ? 'bg-muted text-foreground font-medium' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
        <header className="bg-card border-b border-border px-6 py-4">
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
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Dashboards</span>
                <span>/</span>
                <span className="text-foreground font-medium">{activeSection}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search" 
                  className="pl-10 w-64"
                />
              </div>
              
              <Button variant="ghost" size="sm" className="p-2">
                <Bell className="w-4 h-4" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={signOut} className="p-2">
                <LogOut className="w-4 h-4" />
              </Button>

              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 bg-background">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm" style={{ background: 'var(--gradient-primary)' }}>
              <CardContent className="p-6 text-primary-foreground">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-80">Views</h3>
                  <TrendingUp className="w-4 h-4 opacity-60" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(kpiData.views)}</p>
                  <div className="flex items-center space-x-1 opacity-80">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs">+{kpiData.viewsChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-muted-foreground/90 to-muted-foreground text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-80">Visits</h3>
                  <TrendingUp className="w-4 h-4 opacity-60" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(kpiData.visits)}</p>
                  <div className="flex items-center space-x-1 opacity-80">
                    <TrendingDown className="w-3 h-3" />
                    <span className="text-xs">{kpiData.visitsChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/80 to-primary-glow text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-80">New Users</h3>
                  <TrendingUp className="w-4 h-4 opacity-60" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{kpiData.newUsers}</p>
                  <div className="flex items-center space-x-1 opacity-80">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs">+{kpiData.newUsersChange}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-muted-foreground/80 to-muted-foreground/90 text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium opacity-80">Active Users</h3>
                  <TrendingUp className="w-4 h-4 opacity-60" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{formatNumber(kpiData.activeUsers)}</p>
                  <div className="flex items-center space-x-1 opacity-80">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs">+{kpiData.activeUsersChange}%</span>
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
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">Users</Badge>
                        <Badge variant="outline" className="text-muted-foreground border-border">Projects</Badge>
                        <Badge variant="outline" className="text-muted-foreground border-border">Operating Status</Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Week</span>
                      <Button variant="ghost" size="sm" className="p-1">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip />
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
            </div>

            {/* Device and Location Traffic */}
            <div className="space-y-6">
              {/* Device Traffic */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-primary text-lg font-semibold">Device Traffic</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {deviceData.map((device, index) => (
                      <div key={device.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">{device.name}</span>
                          {device.name === 'Android' && (
                            <Badge className="bg-foreground text-background text-xs px-2 py-1">24.3K</Badge>
                          )}
                        </div>
                        <div className="w-full bg-muted rounded-full h-6 relative">
                          <div 
                            className={`h-6 rounded-full transition-all duration-500 ${
                              device.name === 'Windows' ? 'bg-primary' : 'bg-muted-foreground/30'
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
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-success text-lg font-semibold">Location Traffic</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {locationData.map((location) => (
                      <div key={location.name} className="space-y-2">
                        <span className="text-sm font-medium text-foreground">{location.name}</span>
                        <div className="w-full bg-muted rounded-full h-6">
                          <div 
                            className="h-6 rounded-full bg-muted-foreground/50 transition-all duration-500"
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
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-destructive text-lg font-semibold">Product Traffic</CardTitle>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-muted-foreground">All</Badge>
                    <Badge variant="outline" className="text-muted-foreground">SnowUI</Badge>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Dashboard</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="users" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-team-accent text-lg font-semibold">Projects</CardTitle>
                <Button variant="ghost" size="sm" className="p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Manager</th>
                      <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Date</th>
                      <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Amount</th>
                      <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectData.map((project, index) => (
                      <tr key={project.id} className={`border-b border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={project.avatar} />
                              <AvatarFallback className="bg-muted text-muted-foreground">
                                {project.manager.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{project.manager}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground text-sm">{project.date}</td>
                        <td className="py-4 px-6 font-medium text-foreground">${project.amount}.00</td>
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