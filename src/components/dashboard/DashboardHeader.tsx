import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, RotateCw, ChevronRight, Search, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SendReportsModal } from "./SendReportsModal";
import { InAppInbox } from "@/components/notifications/InAppInbox";

interface NavItemLite {
  id: string;
  label: string;
  icon?: any;
  description?: string;
}

interface DashboardHeaderProps {
  handleRefresh: () => void;
  handleResetFilters: () => void;
  activeSection: string;
  navigationItems: NavItemLite[];
  /** Optional group label for breadcrumb (e.g. "Insights") */
  sectionGroupLabel?: string;
  /** Show the "Reset All Filters" control. Default false; only Analytics needs it. */
  showResetFilters?: boolean;
  /** Show the "Send Reports" CTA. Default false; only Analytics needs it. */
  showSendReports?: boolean;
  /** Optional handler to open the mobile slide-in nav. */
  onOpenMobileNav?: () => void;
}

export const DashboardHeader = ({
  handleRefresh,
  handleResetFilters,
  activeSection,
  navigationItems,
  sectionGroupLabel,
  showResetFilters = false,
  showSendReports = false,
  onOpenMobileNav,
}: DashboardHeaderProps) => {
  const { teamBranding } = useAuth();

  const current = navigationItems.find((n) => n.id === activeSection);
  const sectionLabel = current?.label ?? "Dashboard";
  const sectionDescription =
    current?.description ?? "Professional athlete performance analysis";

  return (
    <div
      className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50"
      style={{
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(4px)",
        boxShadow: "0 4px 12px 0 rgba(0,0,0,0.03)",
      }}
    >
      <div className="w-full px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between min-w-0 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onOpenMobileNav && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 shrink-0"
                onClick={onOpenMobileNav}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            {teamBranding?.logo_url ? (
              <img
                src={teamBranding.logo_url}
                alt="Organization Logo"
                className="w-9 h-9 rounded object-cover shrink-0 hidden sm:block"
              />
            ) : (
              <Activity className="w-8 h-8 shrink-0 text-primary hidden sm:block" />
            )}
            <div className="min-w-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate max-w-[180px]">
                  {teamBranding?.name || "Organization"}
                </span>
                {sectionGroupLabel && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="truncate">{sectionGroupLabel}</span>
                  </>
                )}
                <ChevronRight className="w-3 h-3" />
                <span className="truncate font-medium text-foreground">
                  {sectionLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold truncate text-primary leading-tight">
                {sectionLabel}
              </h1>
              <p className="text-xs sm:text-sm truncate text-muted-foreground">
                {sectionDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {showResetFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                size="sm"
                className="border-accent text-accent hover:bg-accent/10 hidden md:inline-flex"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("nh:open-command-palette"))}
              className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/40 hidden md:inline-flex"
              aria-label="Open command palette"
            >
              <Search className="w-4 h-4 mr-2" />
              <span className="text-xs">Search</span>
              <kbd className="ml-2 hidden lg:inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
              aria-label="Refresh data"
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <InAppInbox />
            {showSendReports && <SendReportsModal />}
          </div>
        </div>
      </div>
    </div>
  );
};
