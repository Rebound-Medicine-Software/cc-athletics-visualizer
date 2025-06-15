import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  Database
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSupabaseData();
  // Only Team Name is global
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // CHANGED: now array
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [resetFiltersKey, setResetFiltersKey] = useState<number>(0);
  const [isSyncingElite, setIsSyncingElite] = useState(false);

  useEffect(() => {
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
    setResetFiltersKey(prev => prev + 1);
    setSelectedTeams([]);
  };

  const handleSyncEliteMetrics = async () => {
    setIsSyncingElite(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("sync-elite-metrics-from-sheets", {
        method: "POST",
      });
      if (error) {
        toast.error(`Elite Metrics Sync failed: ${error.message}`);
      } else if (result && result.success) {
        toast.success(`Sync completed: ${result.rows_inserted} rows inserted.`);
        // Optionally: refetch();
      } else {
        toast.error(result?.error || "Unknown sync error.");
      }
    } catch (e: any) {
      toast.error(`Elite Metrics Sync failed: ${e?.message || e}`);
    } finally {
      setIsSyncingElite(false);
    }
  };

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
      <DashboardHeader
        orgData={orgData}
        handleRefresh={handleRefresh}
        handleResetFilters={handleResetFilters}
      />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* TEMPORARY: Sync Elite Metrics Button for testing */}
        <div className="flex justify-end mb-2">
          {/* Remove this block after testing */}
          <button
            onClick={handleSyncEliteMetrics}
            disabled={isSyncingElite}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-medium px-4 py-2 rounded shadow-sm transition border border-purple-900"
            style={{ zIndex: 50 }}
            title="Trigger a one-time import from Google Sheets (temporary test only)"
          >
            <Database className="w-4 h-4" />
            {isSyncingElite ? "Syncing Elite Metrics..." : "Sync Elite Metrics"}
          </button>
        </div>
        {/* End temporary block */}
        <div className="flex gap-6">
          <DashboardSidebar
            orgData={orgData}
            isNavigationCollapsed={isNavigationCollapsed}
            setIsNavigationCollapsed={setIsNavigationCollapsed}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            navigationItems={navigationItems}
            handleLogout={handleLogout}
          />
          <div className="flex-1">
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
