import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
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
  X,
  RotateCw,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSupabaseData();
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [resetFiltersKey, setResetFiltersKey] = useState<number>(0);

  useEffect(() => {
    // Check if user has API key (is "logged in")
    const apiKey = localStorage.getItem("cc-athletics-api-key");
    if (!apiKey) {
      navigate("/auth");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("cc-athletics-api-key");
    localStorage.removeItem("organization-data");
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleRefresh = () => {
    refetch();
    toast.info("Refreshing data...");
  };

  const handleResetFilters = () => {
    setResetFiltersKey(prev => prev + 1); // Changing key triggers reset downstream
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
      const orgData = localStorage.getItem("organization-data");
      if (orgData) {
        const parsed = JSON.parse(orgData);
        return {
          name: parsed.name || "Rebound Medicine & Performance",
          logo: parsed.logo ? URL.createObjectURL(parsed.logo) : null,
        };
      }
    } catch (error) {
      console.error("Error getting organization data:", error);
    }
    return {
      name: "Rebound Medicine & Performance",
      logo: null,
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

  const errorMessage = error?.message || "";
  const hasNoData = !error && (!data || data.length === 0);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <DashboardHeader
        orgData={orgData}
        handleRefresh={handleRefresh}
        handleResetFilters={handleResetFilters}
      />

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <DashboardSidebar
            orgData={orgData}
            isNavigationCollapsed={isNavigationCollapsed}
            setIsNavigationCollapsed={setIsNavigationCollapsed}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            navigationItems={navigationItems}
            handleLogout={handleLogout}
          />

          {/* Main Content */}
          <div className="flex-1">
            <DashboardContent
              data={data || []}
              isLoading={isLoading}
              error={error}
              errorMessage={errorMessage}
              hasNoData={hasNoData}
              selectedTest={selectedTest}
              setSelectedTest={setSelectedTest}
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              selectedAthlete={selectedAthlete}
              setSelectedAthlete={setSelectedAthlete}
              handleRefresh={handleRefresh}
              orgData={orgData}
              navigationItems={navigationItems}
              activeSection={activeSection}
              resetFiltersKey={resetFiltersKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
