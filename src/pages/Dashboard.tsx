
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Activity, LogOut, AlertCircle, CheckCircle, RefreshCw, ChevronRight, ChevronLeft, Calendar, Users, FileText, Dumbbell, Settings, CreditCard } from "lucide-react";
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
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
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

  // Get organization data for name and logo
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
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Activity,
      description: "Testing reports"
    }, 
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      description: "Calendar & scheduling"
    }, 
    {
      id: "profiles",
      label: "Profiles",
      icon: Users,
      description: "Practitioner management"
    }, 
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      description: "Custom reports & templates"
    }, 
    {
      id: "programming",
      label: "Programming",
      icon: Dumbbell,
      description: "Exercise programs & templates"
    }, 
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      description: "Account & preferences"
    }, 
    {
      id: "payment",
      label: "Payment Packages",
      icon: CreditCard,
      description: "Billing & subscriptions"
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
      {/* Fixed Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {orgData.logo ? (
                <img src={orgData.logo} alt="Organization Logo" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <img src="/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" alt="Default Logo" className="w-8 h-8 rounded-full" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {orgData.name}
                </h1>
                <p className="text-sm text-gray-600">Professional athlete performance analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleRefresh} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="text-gray-600">
                ← Home
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 container mx-auto px-4 py-6 space-y-6">
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
          {/* Fixed Collapsible Sidebar */}
          <div className={`fixed left-0 top-20 h-full bg-white/90 backdrop-blur-sm border-r border-gray-200 transition-all duration-300 z-40 ${isNavigationVisible ? 'w-80' : 'w-12'}`}>
            <div className="p-4 space-y-6">
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => setIsNavigationVisible(!isNavigationVisible)} className="h-8 w-8">
                  {isNavigationVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>

              {isNavigationVisible && (
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
                  <CardContent className="p-6 space-y-2">
                    {navigationItems.map(item => (
                      <Button 
                        key={item.id} 
                        variant={activeSection === item.id ? "default" : "ghost"} 
                        className={`w-full justify-start text-left ${activeSection === item.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`} 
                        onClick={() => setActiveSection(item.id)}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs opacity-70">{item.description}</span>
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Main Content with left margin to account for sidebar */}
          <div className={`flex-1 transition-all duration-300 ${isNavigationVisible ? 'ml-80' : 'ml-12'}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
