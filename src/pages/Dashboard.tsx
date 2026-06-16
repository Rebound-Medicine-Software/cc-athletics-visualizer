
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { toast } from "sonner";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardSkeleton } from "@/components/dashboard/skeletons";
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
  FlaskConical,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();
  const { branding } = useBranding(effectiveTeamId, isImpersonating ? 'organisation' : profile?.role);
  const { data, isLoading, error, refetch } = useSupabaseData();
  // Only Team Name is global
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]); // CHANGED: now array
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : true
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [resetFiltersKey, setResetFiltersKey] = useState<number>(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Allow deep-linking to a specific section via ?section=...
  useEffect(() => {
    const s = searchParams.get("section");
    if (s && s !== activeSection) {
      if (s === "settings") {
        navigate("/settings");
      } else if (s === "admin") {
        navigate("/admin");
      } else {
        setActiveSection(s);
      }
      // Clean up the param after applying so back/forward doesn't re-trigger oddly.
      const next = new URLSearchParams(searchParams);
      next.delete("section");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        { id: "analysis", label: "Analysis", icon: FlaskConical, description: "Testing batteries & movement" },
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
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex gap-3 md:gap-6">
          {/* Mobile overlay */}
          {mobileNavOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={`
              ${mobileNavOpen ? "fixed left-0 top-0 h-full z-50 pt-4 px-2" : "hidden"}
              md:block md:static md:p-0
            `}
          >
            <DashboardSidebar
              orgData={orgData}
              branding={branding}
              isNavigationCollapsed={mobileNavOpen ? false : isNavigationCollapsed}
              setIsNavigationCollapsed={setIsNavigationCollapsed}
              activeSection={activeSection}
              setActiveSection={(s) => {
                setActiveSection(s);
                setMobileNavOpen(false);
              }}
              navigationGroups={navigationGroups}
              navigationItems={navigationItems}
              handleLogout={handleLogout}
              onNavigate={(s) => {
                handleNavigation(s);
                setMobileNavOpen(false);
              }}
            />
          </div>
          <div className="flex-1 min-w-0 px-3 sm:px-4 xl:px-8 2xl:px-12 pt-4 md:pt-6 pb-12">
            <DashboardContent
              data={data || []}
              isLoading={isLoading}
              error={error}
              errorMessage={errorMessage}
              hasNoData={hasNoData}
              selectedTeams={selectedTeams}
              setSelectedTeams={setSelectedTeams}
              handleRefresh={handleRefresh}
              orgData={orgData}
              branding={branding}
              navigationItems={navigationItems}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              resetFiltersKey={resetFiltersKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
