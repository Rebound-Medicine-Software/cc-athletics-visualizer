import React from 'react';
import { DashboardKPICards } from './DashboardKPICards';
import { DashboardCharts } from './DashboardCharts';
import { ActivityFeed } from './ActivityFeed';

interface EnhancedDashboardOverviewProps {
  onKPIClick?: (kpi: string) => void;
}

export const EnhancedDashboardOverview: React.FC<EnhancedDashboardOverviewProps> = ({ onKPIClick }) => {
  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <DashboardKPICards onKPIClick={onKPIClick} />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Charts Section - Takes up 2/3 of the space */}
        <div className="xl:col-span-2">
          <DashboardCharts />
        </div>
        
        {/* Activity Feed - Takes up 1/3 of the space */}
        <div className="xl:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};