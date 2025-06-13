
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Activity, LogOut, AlertCircle, CheckCircle, RefreshCw, Calendar, Users, FileText, Dumbbell, Settings, CreditCard } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSupabaseData();
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedTestDates, setSelectedTestDates] = useState<string[]>([]);
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

  // Get organization data safely
  const getOrganizationData = () => {
    try {
      const orgData = localStorage.getItem('organization-data');
      if (orgData) {
        const parsed = JSON.parse(orgData);
        return {
          name: parsed.name || "Rebound Medicine & Performance",
          logo: parsed.logo && typeof parsed.logo === 'string' ? parsed.logo : null
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
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Activity,
      description: "Performance Analytics"
    }, 
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      description: "Schedule Management"
    }, 
    {
      id: "profiles",
      label: "Profiles",
      icon: Users,
      description: "Athlete Management"
    }, 
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      description: "Custom Reports"
    }, 
    {
      id: "programming",
      label: "Programming",
      icon: Dumbbell,
      description: "Exercise Programs"
    }, 
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      description: "System Settings"
    }, 
    {
      id: "payment",
      label: "Billing",
      icon: CreditCard,
      description: "Subscription Management"
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardLayout 
          data={data || []} 
          selectedTest={selectedTest} 
          selectedTeams={selectedTeams} 
          selectedAthletes={selectedAthletes} 
          selectedTestDates={selectedTestDates} 
          onTestChange={setSelectedTest} 
          onTeamsChange={setSelectedTeams} 
          onAthletesChange={setSelectedAthletes} 
          onTestDatesChange={setSelectedTestDates} 
        />;
      default:
        return (
          <div className="space-y-6">
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">This section is under development. Check back soon for updates.</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const errorMessage = error?.message || "";
  const hasNoData = !error && (!data || data.length === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header - Fixed */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {orgData.logo ? (
                <img src={orgData.logo} alt="Organization Logo" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{orgData.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{orgData.name}</h1>
                <p className="text-sm text-gray-500">Performance Analytics Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleRefresh} className="text-gray-600 border-gray-300 hover:bg-gray-50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 max-w-7xl mx-auto px-6 py-6">
        {/* Status Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Data loading error: {errorMessage}
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
              Connected to CC Athletics API - {data.length} test records loaded
              <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">Live Data</Badge>
            </AlertDescription>
          </Alert>
        )}

        {hasNoData && (
          <Alert className="border-orange-200 bg-orange-50 mb-6">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="font-medium mb-1">No performance data available</div>
              <p className="text-sm">API connection established but no test data found. Contact support if needed.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Layout with Fixed Sidebar */}
        <div className="flex gap-6">
          {/* Fixed Navigation Sidebar */}
          <div className="w-64 fixed left-6 top-32 h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200 shadow-sm overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Navigation</h3>
              <div className="space-y-1">
                {navigationItems.map(item => (
                  <Button 
                    key={item.id} 
                    variant={activeSection === item.id ? "default" : "ghost"} 
                    className={`w-full justify-start text-left ${
                      activeSection === item.id 
                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`} 
                    onClick={() => setActiveSection(item.id)}
                  >
                    <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium text-sm">{item.label}</span>
                      <span className="text-xs opacity-70 truncate w-full">{item.description}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 ml-64 pl-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
