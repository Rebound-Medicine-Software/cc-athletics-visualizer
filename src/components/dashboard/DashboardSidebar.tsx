import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, LogOut, Menu, X } from "lucide-react";
import { TeamBranding } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  orgData: { name: string; logo: string | null };
  branding?: TeamBranding | null;
  isNavigationCollapsed: boolean;
  setIsNavigationCollapsed: (collapsed: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  /** Legacy flat list (kept for backwards compatibility) */
  navigationItems?: NavItem[];
  /** Preferred: grouped navigation */
  navigationGroups?: NavGroup[];
  handleLogout: () => void;
  onNavigate?: (section: string) => void;
}

export const DashboardSidebar = ({
  orgData,
  branding,
  isNavigationCollapsed,
  setIsNavigationCollapsed,
  activeSection,
  setActiveSection,
  navigationItems,
  navigationGroups,
  handleLogout,
  onNavigate,
}: DashboardSidebarProps) => {
  const reduce = useReducedMotion();
  const handleItemClick = (itemId: string) => {
    if (itemId === "settings" || itemId === "profiles" || itemId === "admin") {
      onNavigate?.(itemId);
    } else {
      setActiveSection(itemId);
    }
  };

  // Build groups: prefer explicit groups, otherwise treat flat list as one group
  const groups: NavGroup[] =
    navigationGroups && navigationGroups.length > 0
      ? navigationGroups
      : [{ label: "", items: navigationItems ?? [] }];

  return (
    <div
      className={`
        transition-all duration-300
        ${isNavigationCollapsed ? "w-16" : "w-64"}
        md:sticky md:top-32 md:self-start md:z-40 md:mt-10
      `}
      aria-label="Dashboard navigation"
    >
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            {!isNavigationCollapsed && (
              <div className="flex items-center gap-3 min-w-0">
                {(branding?.logo_url || orgData.logo) ? (
                  <img
                    src={branding?.logo_url || orgData.logo || ''}
                    alt="Organization Logo"
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary shrink-0">
                    <Activity className="w-6 h-6 text-primary-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-primary truncate">
                    {branding?.name || orgData.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Performance Analytics
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNavigationCollapsed(!isNavigationCollapsed)}
              className="h-8 w-8 shrink-0"
              aria-label={isNavigationCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isNavigationCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>

          {/* Grouped Navigation Menu */}
          <nav className="mb-6 space-y-4">
            {groups.map((group, gi) => (
              <div key={`${group.label || 'group'}-${gi}`} className="space-y-1">
                {!isNavigationCollapsed && group.label && (
                  <div className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {group.label}
                  </div>
                )}
                {isNavigationCollapsed && gi > 0 && (
                  <div className="mx-2 my-2 border-t border-border" aria-hidden="true" />
                )}
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <div key={item.id} className="relative">
                      {isActive && !reduce && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-md bg-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          aria-hidden="true"
                        />
                      )}
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={`relative w-full justify-start text-left overflow-hidden transition-transform hover:translate-x-0.5 ${isNavigationCollapsed ? "px-2" : ""} ${isActive && !reduce ? "bg-transparent hover:bg-transparent" : ""}`}
                        onClick={() => handleItemClick(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        title={isNavigationCollapsed ? item.label : undefined}
                      >
                        <item.icon className={`w-4 h-4 ${isNavigationCollapsed ? "" : "mr-3"} ${isActive ? "text-primary-foreground" : ""}`} />
                        {!isNavigationCollapsed && (
                          <div className={`flex flex-col items-start min-w-0 overflow-hidden ${isActive ? "text-primary-foreground" : ""}`}>
                            <span className="font-medium truncate w-full">{item.label}</span>
                            <span className="text-xs opacity-70 truncate w-full">{item.description}</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sign Out - Footer */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className={`w-full justify-start text-red-600 border-red-200 hover:bg-red-50 ${
                isNavigationCollapsed ? "px-2" : ""
              }`}
              aria-label="Sign out"
            >
              <LogOut className={`w-4 h-4 ${isNavigationCollapsed ? "" : "mr-3"}`} />
              {!isNavigationCollapsed && <span>Sign Out</span>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
