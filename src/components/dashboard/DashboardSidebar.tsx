import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, LogOut, Menu, X } from "lucide-react";
import { TeamBranding } from "@/contexts/AuthContext";

interface DashboardSidebarProps {
  orgData: { name: string; logo: string | null };
  branding?: TeamBranding | null;
  isNavigationCollapsed: boolean;
  setIsNavigationCollapsed: (collapsed: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  navigationItems: Array<{ id: string; label: string; icon: any; description: string }>;
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
  handleLogout,
  onNavigate,
}: DashboardSidebarProps) => {
  const handleItemClick = (itemId: string) => {
    if (itemId === "settings") {
      onNavigate?.(itemId);
    } else {
      setActiveSection(itemId);
    }
  };
  return (
    <div
      className={`
        transition-all duration-300
        ${isNavigationCollapsed ? "w-16" : "w-64"}
        sticky top-0 self-start z-50
      `}>
      <div className="space-y-6">
        {/* Sidebar Header */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              {!isNavigationCollapsed && (
                <div className="flex items-center gap-3">
                  {(branding?.logo_url || orgData.logo) ? (
                    <img
                      src={branding?.logo_url || orgData.logo || ''}
                      alt="Organization Logo"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary">
                      <Activity className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-sm text-primary">
                      {branding?.name || orgData.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
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
              >
                {isNavigationCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            </div>
            {/* Navigation Menu */}
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left ${isNavigationCollapsed ? "px-2" : ""}`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <item.icon className={`w-4 h-4 ${isNavigationCollapsed ? "" : "mr-3"}`} />
                  {!isNavigationCollapsed && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs opacity-70">{item.description}</span>
                    </div>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Footer - Sign Out */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className={`w-full justify-start text-red-600 border-red-200 hover:bg-red-50 ${
                isNavigationCollapsed ? "px-2" : ""
              }`}
            >
              <LogOut className={`w-4 h-4 ${isNavigationCollapsed ? "" : "mr-3"}`} />
              {!isNavigationCollapsed && <span>Sign Out</span>}
            </Button>
            {!isNavigationCollapsed && (
              <p className="text-xs text-gray-500 mt-2 text-center">© 2025 {orgData.name}. All rights reserved.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
