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
    <div className="pr-header sticky top-0 z-50">
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
                className="w-10 h-10 rounded-xl object-cover shrink-0 hidden sm:block"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl items-center justify-center shrink-0 hidden sm:flex"
                style={{ background: 'hsl(var(--pr-accent-soft))' }}
              >
                <Activity className="w-5 h-5" style={{ color: 'hsl(var(--pr-accent))' }} />
              </div>
            )}
            <div className="min-w-0">
              {/* Breadcrumb */}
              <div className="pr-crumb flex items-center gap-1 text-xs">
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
                <span className="pr-crumb-current truncate">
                  {sectionLabel}
                </span>
              </div>
              <h1 className="pr-header-title text-xl sm:text-2xl truncate leading-tight">
                {sectionLabel}
              </h1>
              <p className="pr-header-sub text-xs sm:text-sm truncate">
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
                className="pr-header-btn hidden md:inline-flex"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("nh:open-command-palette"))}
              className="pr-header-btn hidden md:inline-flex"
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
              className="pr-header-btn-primary"
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
