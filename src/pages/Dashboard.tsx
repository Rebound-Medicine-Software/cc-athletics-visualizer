
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
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
  Shield,
  BarChart3,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();
  const { branding } = useBranding(effectiveTeamId, isImpersonating ? 'organisation' : profile?.role);
  const { data, isLoading, error, refetch } = useSupabaseData();
  // Only Team Name is global
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // CHANGED: now array
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(window.innerWidth < 1200);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [resetFiltersKey, setResetFiltersKey] = useState<number>(0);

  // Auth/role gating now handled centrally by <ProtectedRoute> + <RoleGate> in App.tsx.

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
      navigate("/settings");
    } else if (section === "profiles") {
      setActiveSection("profiles");
    } else if (section === "admin") {
      navigate("/admin");
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

  const navigationGroups = [
    {
      label: "Insights",
      items: [
        { id: "home", label: "Home", icon: Home, description: "Insights & company feed" },
        { id: "dashboard", label: "Analytics", icon: BarChart3, description: "Testing reports" },
        { id: "live-data", label: "Live Data", icon: Activity, description: "Real-time force plate data" },
      ],
    },
    {
      label: "Operations",
      items: [
        { id: "bookings", label: "Bookings", icon: Calendar, description: "Calendar & scheduling" },
        { id: "reports", label: "Reports", icon: FileText, description: "Custom reports & templates" },
        { id: "programming", label: "Programming", icon: Dumbbell, description: "Exercise programs & templates" },
      ],
    },
    {
      label: "Management",
      items: [
        { id: "profiles", label: "Profiles", icon: Users, description: "Practitioner management" },
        { id: "payment", label: "Payment Packages", icon: CreditCard, description: "Billing & subscriptions" },
      ],
    },
    {
      label: "Account",
      items: [
        { id: "settings", label: "Settings", icon: Settings, description: "Account & preferences" },
        ...(profile?.role === 'super_admin'
          ? [{ id: "admin", label: "Super Admin", icon: Shield, description: "Platform administration" }]
          : []),
      ],
    },
  ];

  // Flat list kept for header lookup + content compatibility
  const navigationItems = navigationGroups.flatMap((g) => g.items);

  // Map active section id -> group label for breadcrumb
  const sectionGroupLabel = navigationGroups.find((g) =>
    g.items.some((i) => i.id === activeSection)
  )?.label;

  const errorMessage = error?.message || "";
  const hasNoData = !error && (!data || data.length === 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-12">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Persistent dashboard header across all sections */}
      <DashboardHeader
        handleRefresh={handleRefresh}
        handleResetFilters={handleResetFilters}
        activeSection={activeSection}
        navigationItems={navigationItems}
        sectionGroupLabel={sectionGroupLabel}
        showResetFilters={activeSection === "dashboard"}
        showSendReports={activeSection === "dashboard"}
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
            navigationGroups={navigationGroups}
            navigationItems={navigationItems}
            handleLogout={handleLogout}
            onNavigate={handleNavigation}
          />
          <div className="flex-1 min-w-0 px-4 xl:px-8 2xl:px-12 pt-6 pb-12">
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
              branding={branding}
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
