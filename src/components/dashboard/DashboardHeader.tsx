
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, RotateCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SendReportsModal } from "./SendReportsModal";

interface DashboardHeaderProps {
  handleRefresh: () => void;
  handleResetFilters: () => void;
  activeSection: string;
  navigationItems: Array<{ id: string; label: string; icon: any; description: string }>;
}

export const DashboardHeader = ({
  handleRefresh,
  handleResetFilters,
  activeSection,
  navigationItems,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { teamBranding, profile } = useAuth();
  return (
    <div
      className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50"
      style={{
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(4px)",
        boxShadow: "0 4px 12px 0 rgba(0,0,0,0.03)",
      }}
    >
      <div className="w-full px-6 py-5">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {teamBranding?.logo_url ? (
              <img 
                src={teamBranding.logo_url} 
                alt="Organization Logo" 
                className="w-8 h-8 rounded object-cover shrink-0" 
              />
            ) : (
              <Activity className="w-8 h-8 shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate text-primary">
                {teamBranding?.name || "Organization"} Testing Report
              </h1>
              <p className="text-sm truncate text-muted-foreground">
                Professional athlete performance analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Reset All Filters Button */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="border-accent text-accent hover:bg-accent/10 flex items-center"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Reset All Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="border-primary text-primary hover:bg-primary/10 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <SendReportsModal />
          </div>
        </div>
      </div>
    </div>
  );
};
