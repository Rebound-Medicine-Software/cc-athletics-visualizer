
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportFilters } from "@/components/dashboard/ReportFilters";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { HighlightsSection } from "@/components/dashboard/HighlightsSection";
import { RegionComparison } from "@/components/dashboard/RegionComparison";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { formatDate } from "@/utils/dateUtils";
import { 
  Activity, 
  LogOut, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ChevronLeft,
  ChevronRight,
  Home,
  Calendar,
  Users,
  FileText,
  Dumbbell,
  Settings,
  CreditCard,
  Menu,
  X,
  BarChart3,
  TrendingUp,
  MapPin
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSupabaseData();
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [selectedTestDate, setSelectedTestDate] = useState<string>("");
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    // Check if user has API key (is "logged in")
    const apiKey = localStorage.getItem('cc-athletics-api-key');
    if (!apiKey) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('cc-athletics-api-key');
    localStorage.removeItem('organization-data');
    toast.success("Logged out successfully");
    navigate('/auth');
  };

  const handleRefresh = () => {
    refetch();
    toast.info("Refreshing data...");
  };

  // Filter data based on selected teams
  const filteredData = data?.filter(test => 
    selectedTeams.length === 0 || selectedTeams.includes(test.team_name)
  ) || [];

  // Get organization data for logo and branding
  const getOrganizationData = () => {
    try {
      const orgData = localStorage.getItem('organization-data');
      if (orgData) {
        const parsed = JSON.parse(orgData);
        return {
          name: parsed.name || "Rebound Medicine & Performance",
          logo: parsed.logo ? URL.createObjectURL(parsed.logo) : null
        };
      }
    } catch (error) {
      console.error('Error getting organization data:', error);
    }
    return {
      name: "Rebound Medicine & Performance",
      logo: null
    };
  };

  const orgData = getOrganizationData();

  const navigationItems = [
    { id: "home", label: "Home", icon: Home, description: "Dashboard overview" },
    { id: "dashboard", label: "Analytics", icon: BarChart3, description: "Performance analytics" },
    { id: "bookings", label: "Calendar", icon: Calendar, description: "Schedule & bookings" },
    { id: "profiles", label: "Athletes", icon: Users, description: "Athlete profiles" },
    { id: "reports", label: "Reports", icon: FileText, description: "Custom reports" },
    { id: "programming", label: "Programs", icon: Dumbbell, description: "Training programs" },
    { id: "regional", label: "Regional", icon: MapPin, description: "Regional analysis" },
    { id: "settings", label: "Settings", icon: Settings, description: "Account settings" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Home className="w-6 h-6 text-blue-600" />
                  </div>
                  Welcome to {orgData.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-lg">Your comprehensive force plate analysis platform. Navigate to Analytics to view detailed performance data.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Analytics</h3>
                    </div>
                    <p className="text-sm text-blue-700">View performance metrics and insights</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">Athletes</h3>
                    </div>
                    <p className="text-sm text-green-700">Manage athlete profiles and data</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">Reports</h3>
                    </div>
                    <p className="text-sm text-purple-700">Generate custom reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Test Selection Notice */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-600">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-1">
                      {selectedTest ? `Analyzing: ${selectedTest}` : "Select Test Type for Analysis"}
                    </h2>
                    <p className="text-gray-600">
                      {selectedTest 
                        ? `Comprehensive analysis for ${selectedTest} across all athletes`
                        : "Choose a test type from the filters below to begin detailed analysis"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Highlights */}
            <HighlightsSection
              data={filteredData.map(item => ({
                ...item,
                test_date: formatDate(item.test_date)
              }))}
              selectedAthlete={selectedAthlete}
              selectedTestDate={selectedTestDate}
              onAthleteChange={(athlete) => setSelectedAthlete(athlete === "all" ? "" : athlete)}
              onTestDateChange={(date) => setSelectedTestDate(date === "all" ? "" : date)}
            />

            {/* Filters with integrated comparison chart */}
            <ReportFilters 
              data={filteredData} 
              onTestSelect={setSelectedTest}
              selectedTeams={selectedTeams}
              onTeamsChange={setSelectedTeams}
              allData={data || []}
            />

            {/* Metric Cards */}
            <MetricCards selectedTest={selectedTest} data={filteredData} />

            {/* Region Comparisons */}
            <RegionComparison data={filteredData} />
          </div>
        );
      case "regional":
        return (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-green-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  Regional Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Regional performance comparisons and geographical insights coming soon.</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-gray-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {navigationItems.find(item => item.id === activeSection)?.icon && (
                      React.createElement(navigationItems.find(item => item.id === activeSection)!.icon, {
                        className: "w-6 h-6 text-gray-600"
                      })
                    )}
                  </div>
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">This section is coming soon! We're working hard to bring you the best experience.</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const errorMessage = error?.message || "";
  const hasNoData = !error && (!data || data.length === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsNavigationCollapsed(!isNavigationCollapsed)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {orgData.name}
                  </h1>
                  <p className="text-sm text-gray-600">Professional Performance Analytics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="text-gray-600"
              >
                ← Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Collapsible Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          isNavigationCollapsed ? 'w-16' : 'w-72'
        } ${isNavigationCollapsed ? 'lg:w-16' : 'lg:w-72'}`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {!isNavigationCollapsed && (
                  <div className="flex items-center gap-3">
                    {orgData.logo ? (
                      <img 
                        src={orgData.logo}
                        alt="Organization Logo" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{orgData.name}</h3>
                      <p className="text-xs text-gray-600">Analytics Platform</p>
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNavigationCollapsed(!isNavigationCollapsed)}
                  className="h-8 w-8 shrink-0 hidden lg:flex"
                >
                  {isNavigationCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeSection === item.id ? "default" : "ghost"}
                    className={`w-full justify-start text-left ${
                      activeSection === item.id 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "text-gray-600 hover:bg-gray-100"
                    } ${isNavigationCollapsed ? 'px-2' : 'px-4'} py-3 h-auto`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${isNavigationCollapsed ? '' : 'mr-3'}`} />
                    {!isNavigationCollapsed && (
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium truncate">{item.label}</span>
                        <span className="text-xs opacity-70 truncate">{item.description}</span>
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Footer - Sign Out */}
            <div className="p-2 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleLogout}
                className={`w-full justify-start text-red-600 border-red-200 hover:bg-red-50 ${
                  isNavigationCollapsed ? 'px-2' : 'px-4'
                } py-3 h-auto`}
              >
                <LogOut className={`w-5 h-5 shrink-0 ${isNavigationCollapsed ? '' : 'mr-3'}`} />
                {!isNavigationCollapsed && <span>Sign Out</span>}
              </Button>
              {!isNavigationCollapsed && (
                <p className="text-xs text-gray-500 mt-2 text-center px-2">
                  © 2025 {orgData.name}. All rights reserved.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-6">
            {/* Data Status */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading data: {errorMessage}
                  <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {data && data.length > 0 && (
              <Alert className="border-green-200 bg-green-50 mb-6">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Dashboard loaded successfully with {data.length} test records from CC Athletics API
                  <Badge className="ml-2 bg-green-100 text-green-800">Live Data</Badge>
                </AlertDescription>
              </Alert>
            )}

            {hasNoData && (
              <Alert className="border-orange-200 bg-orange-50 mb-6">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="font-semibold mb-2">No test data found in your database</div>
                  <p className="text-sm">Your API key is valid, but no test data was found. Please contact support if you believe this is an error.</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Main Content */}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
