
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { toast } from "sonner";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import {
  Activity,
  LogOut,
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
  const { user, loading, signOut, profile } = useAuth();
  const { branding } = useBranding(profile?.team_id, profile?.role);
  const { data, isLoading, error, refetch } = useSupabaseData();
  // Only Team Name is global
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // CHANGED: now array
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [resetFiltersKey, setResetFiltersKey] = useState<number>(0);

  useEffect(() => {
    // Check authentication using Supabase auth instead of localStorage
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem("cc-athletics-api-key");
      localStorage.removeItem("organization-data");
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback logout
      localStorage.removeItem("cc-athletics-api-key");
      localStorage.removeItem("organization-data");
      navigate("/auth");
    }
  };

  const handleNavigation = (section: string) => {
    if (section === "settings") {
      navigate("/settings(Consumer1)");
    } else {
      setActiveSection(section);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.info("Refreshing data...");
  };

  const handleResetFilters = () => {
    setResetFiltersKey(prev => prev + 1);
    setSelectedTeams([]);
  };

  const getOrganizationData = () => {
    try {
      const orgData = localStorage.getItem("organization-data");
      if (orgData) {
        const parsed = JSON.parse(orgData);
        return {
          name: parsed.name || "Rebound Medicine & Performance",
          logo: parsed.logo || null, // Logo is now a data URL string
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
      <DashboardHeader
        handleRefresh={handleRefresh}
        handleResetFilters={handleResetFilters}
      />
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex gap-6">
          <DashboardSidebar
            orgData={orgData}
            branding={branding}
            isNavigationCollapsed={isNavigationCollapsed}
            setIsNavigationCollapsed={setIsNavigationCollapsed}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            navigationItems={navigationItems}
            handleLogout={handleLogout}
            onNavigate={handleNavigation}
          />
          <div className="flex-1 min-w-0 px-4 xl:px-8 2xl:px-12">
            <DashboardContent
              data={data || []}
              isLoading={isLoading}
              error={error}
              errorMessage={errorMessage}
              hasNoData={hasNoData}
              selectedTeams={selectedTeams} // CHANGED: pass array
              setSelectedTeams={setSelectedTeams} // CHANGED: pass setter
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
