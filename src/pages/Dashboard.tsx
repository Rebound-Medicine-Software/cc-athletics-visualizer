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
import { 
  Activity, 
  LogOut, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ChevronRight,
  ChevronLeft,
  Home,
  Calendar,
  Users,
  FileText,
  Dumbbell,
  Settings,
  CreditCard,
  Menu,
  X
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSupabaseData();
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
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

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filter data based on selected team and athlete (master filters)
  const filteredData = data?.filter(test => {
    const teamMatch = !selectedTeam || selectedTeam === "all" || test.team_name === selectedTeam;
    const athleteMatch = !selectedAthlete || selectedAthlete === "all" || test.athlete_name === selectedAthlete;
    return teamMatch && athleteMatch;
  }) || [];

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
    { id: "home", label: "Home", icon: Home, description: "Insights & company feed" },
    { id: "dashboard", label: "Analytics", icon: Activity, description: "Testing reports" },
    { id: "bookings", label: "Bookings", icon: Calendar, description: "Calendar & scheduling" },
    { id: "profiles", label: "Profiles", icon: Users, description: "Practitioner management" },
    { id: "reports", label: "Reports", icon: FileText, description: "Custom reports & templates" },
    { id: "programming", label: "Programming", icon: Dumbbell, description: "Exercise programs & templates" },
    { id: "settings", label: "Settings", icon: Settings, description: "Account & preferences" },
    { id: "payment", label: "Payment Packages", icon: CreditCard, description: "Billing & subscriptions" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to {orgData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Your comprehensive force plate analysis platform dashboard.</p>
              </CardContent>
            </Card>
          </div>
        );
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Test Selection Notice */}
            <Card className="bg-gray-100 border-gray-300">
              <CardContent className="p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  {selectedTest ? `Analyzing: ${selectedTest}` : "Please Select A 'Test Name'"}
                </h2>
                <p className="text-gray-600">
                  {selectedTest 
                    ? `Viewing detailed analysis for ${selectedTest} across all athletes`
                    : "Choose a test from the filters below to view detailed analysis"
                  }
                </p>
              </CardContent>
            </Card>

            {/* Highlights Section with master filters */}
            <HighlightsSection
              data={data || []}
              selectedTeam={selectedTeam}
              selectedAthlete={selectedAthlete}
              onTeamChange={(team) => setSelectedTeam(team === "all" ? "" : team)}
              onAthleteChange={(athlete) => setSelectedAthlete(athlete === "all" ? "" : athlete)}
            />

            {/* Individual Filters with Metric Cards after Chart */}
            <ReportFilters 
              data={filteredData} 
              onTestSelect={setSelectedTest}
              allData={data || []}
              metricCardsSlot={
                <MetricCards selectedTest={selectedTest} data={filteredData} />
              }
            />

            {/* Region Comparisons */}
            <RegionComparison data={filteredData} />
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{navigationItems.find(item => item.id === activeSection)?.label}</CardTitle>
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
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {orgData.name} Testing Report
                </h1>
                <p className="text-sm text-gray-600">Professional athlete performance analysis</p>
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

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Data Status */}
        {error && (
          <Alert variant="destructive">
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
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Dashboard loaded successfully with {data.length} test records from CC Athletics API
              <Badge className="ml-2 bg-green-100 text-green-800">Live Data</Badge>
            </AlertDescription>
          </Alert>
        )}

        {hasNoData && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="font-semibold mb-2">No test data found in your database</div>
              <p className="text-sm">Your API key is valid, but no test data was found. Please contact support if you believe this is an error.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Layout */}
        <div className="flex gap-6">
          {/* Collapsible Sidebar */}
          <div className={`transition-all duration-300 ${isNavigationCollapsed ? 'w-16' : 'w-80'}`}>
            <div className="space-y-6">
              {/* Sidebar Header */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
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
                          <h3 className="font-semibold text-gray-800 text-sm">{orgData.name}</h3>
                          <p className="text-xs text-gray-600">Performance Analytics</p>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsNavigationCollapsed(!isNavigationCollapsed)}
                      className="h-8 w-8 shrink-0"
                    >
                      {isNavigationCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Navigation Menu */}
                  <div className="space-y-2">
                    {navigationItems.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeSection === item.id ? "default" : "ghost"}
                        className={`w-full justify-start text-left ${
                          activeSection === item.id 
                            ? "bg-blue-600 text-white" 
                            : "text-gray-600 hover:bg-gray-100"
                        } ${isNavigationCollapsed ? 'px-2' : ''}`}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <item.icon className={`w-4 h-4 ${isNavigationCollapsed ? '' : 'mr-3'}`} />
                        {!isNavigationCollapsed && (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-xs opacity-70">{item.description}</span>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Footer - Sign Out */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className={`w-full justify-start text-red-600 border-red-200 hover:bg-red-50 ${
                      isNavigationCollapsed ? 'px-2' : ''
                    }`}
                  >
                    <LogOut className={`w-4 h-4 ${isNavigationCollapsed ? '' : 'mr-3'}`} />
                    {!isNavigationCollapsed && <span>Sign Out</span>}
                  </Button>
                  {!isNavigationCollapsed && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      © 2025 {orgData.name}. All rights reserved.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
