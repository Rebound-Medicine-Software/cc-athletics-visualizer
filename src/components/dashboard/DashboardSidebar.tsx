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
      <div className="pr-sidebar p-4">
        <div className="flex items-center justify-between mb-5">
          {!isNavigationCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              {(branding?.logo_url || orgData.logo) ? (
                <img
                  src={branding?.logo_url || orgData.logo || ''}
                  alt="Organization Logo"
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'hsl(var(--pr-accent))' }}
                >
                  <Activity className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="pr-sidebar-brand font-semibold text-sm truncate">
                  {branding?.name || orgData.name}
                </h3>
                <p className="pr-sidebar-brand-sub text-[11px] truncate">
                  Performance Analytics
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNavigationCollapsed(!isNavigationCollapsed)}
            className="pr-sidebar-toggle h-8 w-8 shrink-0 hover:bg-transparent"
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
                <div className="pr-sidebar-group-label px-2 pt-1 pb-1 text-[10px] font-semibold uppercase">
                  {group.label}
                </div>
              )}
              {isNavigationCollapsed && gi > 0 && (
                <div className="pr-sidebar-divider mx-2 my-2 border-t" aria-hidden="true" />
              )}
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <div key={item.id} className="relative">
                    {isActive && !reduce && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="pr-nav-pill absolute inset-0"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        aria-hidden="true"
                      />
                    )}
                    <Button
                      variant="ghost"
                      className={`pr-nav-item relative w-full justify-start text-left overflow-hidden hover:bg-transparent ${isNavigationCollapsed ? "px-2" : ""} ${isActive ? "is-active" : ""}`}
                      onClick={() => handleItemClick(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      title={isNavigationCollapsed ? item.label : undefined}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${isNavigationCollapsed ? "" : "mr-3"}`} />
                      {!isNavigationCollapsed && (
                        <div className="flex flex-col items-start min-w-0 overflow-hidden">
                          <span className="font-medium truncate w-full">{item.label}</span>
                          <span className="pr-nav-sub text-[11px] truncate w-full">{item.description}</span>
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
        <div className="pr-sidebar-divider border-t pt-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            className={`pr-signout w-full justify-start ${
              isNavigationCollapsed ? "px-2" : ""
            }`}
            aria-label="Sign out"
          >
            <LogOut className={`w-4 h-4 ${isNavigationCollapsed ? "" : "mr-3"}`} />
            {!isNavigationCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </div>
    </div>
  );
};

