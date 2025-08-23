import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  handleRefresh: () => void;
  handleResetFilters: () => void;
}

export const DashboardHeader = ({
  handleRefresh,
  handleResetFilters,
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
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {teamBranding?.logo_url ? (
              <img 
                src={teamBranding.logo_url} 
                alt="Organization Logo" 
                className="w-8 h-8 rounded object-cover shrink-0" 
              />
            ) : (
              <Activity className="w-8 h-8 shrink-0" style={{ color: teamBranding?.primary_color || '#3B82F6' }} />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate" style={{ color: teamBranding?.primary_color || '#1F2937' }}>
                {teamBranding?.name || profile?.team_id ? 'Organization' : 'Force Plate'} Testing Report
              </h1>
              <p className="text-sm truncate" style={{ color: teamBranding?.secondary_color || '#6B7280' }}>
                Professional athlete performance analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Reset All Filters Button */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="text-orange-600 border-orange-200 hover:bg-orange-50 flex items-center"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Reset All Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="text-gray-600"
            >
              ← Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
