import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import ValdReportHub from "@/components/vald/ValdReportHub";
import { toast } from "sonner";
import {
  Home,
  BarChart3,
  FlaskConical,
  Activity,
  Calendar,
  FileText,
  Dumbbell,
  Users,
  CreditCard,
  Settings,
  Shield,
} from "lucide-react";
import "@/components/dashboard/practitioner-theme.css";

const ValdHub = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();
  const { branding } = useBranding(
    effectiveTeamId,
    isImpersonating ? "organisation" : profile?.role
  );

  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1200 : true
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const orgData = (() => {
    try {
      const raw = localStorage.getItem("organization-data");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          name: parsed.name || "Rebound Medicine & Performance",
          logo: parsed.logo || null,
        };
      }
    } catch (error) {
      console.error("Error getting organization data:", error);
    }
    return {
      name: "Rebound Medicine & Performance",
      logo: null,
    };
  })();

  const navigationGroups: any[] = [
    {
      label: "Insights",
      items: [
        { id: "home", label: "Home", icon: Home, description: "Insights & company feed" },
        { id: "dashboard", label: "Analytics", icon: BarChart3, description: "Testing reports" },
        { id: "analysis", label: "Analysis", icon: FlaskConical, description: "Testing batteries & movement" },
        { id: "live-data", label: "Live Data", icon: Activity, description: "Real-time force plate data" },
        { id: "vald-hub", label: "VALD Hub", icon: Activity, description: "Force plate assessments and performance reports" },
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
        ...(profile?.role === "super_admin"
          ? [{ id: "admin", label: "Super Admin", icon: Shield, description: "Platform administration" }]
          : []),
      ],
    },
  ];

  const navigationItems: any[] = navigationGroups.flatMap((g) => g.items);

  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem("cc-athletics-api-key");
      localStorage.removeItem("organization-data");
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("cc-athletics-api-key");
      localStorage.removeItem("organization-data");
      navigate("/auth");
    }
  };

  const handleNavigation = (section: string) => {
    if (section === "settings") {
      navigate("/settings");
    } else if (section === "admin") {
      navigate("/admin");
    } else if (section === "vald-hub") {
      setMobileNavOpen(false);
    } else {
      navigate(`/dashboard?section=${section}`);
      setMobileNavOpen(false);
    }
  };

  const handleRefresh = () => {
    toast.info("Refreshing data...");
  };

  const handleResetFilters = () => {
    // No-op on this page.
  };

  return (
    <div className="practitioner-shell min-h-screen">
      <style>{`
        @media print {
          .vald-print-header,
          .vald-print-sidebar,
          .vald-print-mobile-overlay {
            display: none !important;
          }
          .vald-print-content {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .practitioner-shell {
            background: white !important;
          }
        }
      `}</style>

      <div className="vald-print-header">
        <DashboardHeader
          handleRefresh={handleRefresh}
          handleResetFilters={handleResetFilters}
          activeSection="vald-hub"
          navigationItems={navigationItems}
          sectionGroupLabel="Insights"
          showResetFilters={false}
          showSendReports={false}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto">
        <div className="flex gap-3 md:gap-6">
          {mobileNavOpen && (
            <div
              className="vald-print-mobile-overlay fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={`
              ${mobileNavOpen ? "fixed left-0 top-0 h-full z-50 pt-4 px-2" : "hidden"}
              md:block md:static md:p-0
              vald-print-sidebar
            `}
          >
            <DashboardSidebar
              orgData={orgData}
              branding={branding}
              isNavigationCollapsed={mobileNavOpen ? false : isNavigationCollapsed}
              setIsNavigationCollapsed={setIsNavigationCollapsed}
              activeSection="vald-hub"
              setActiveSection={handleNavigation}
              navigationGroups={navigationGroups}
              navigationItems={navigationItems}
              handleLogout={handleLogout}
              onNavigate={handleNavigation}
            />
          </div>

          <div className="vald-print-content flex-1 min-w-0 px-3 sm:px-4 xl:px-8 2xl:px-12 pt-4 md:pt-6 pb-12">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">VALD Performance Hub</h1>
              <p className="text-sm text-muted-foreground">Force Plate Assessment Reports</p>
            </div>
            <ValdReportHub />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValdHub;
