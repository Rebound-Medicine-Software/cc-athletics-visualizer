import React from 'react';
import { DashboardKPICards } from './DashboardKPICards';
import { DashboardCharts } from './DashboardCharts';
import { ActivityFeed } from './ActivityFeed';

interface EnhancedDashboardOverviewProps {
  onSectionChange: (section: string) => void;
}

export const EnhancedDashboardOverview: React.FC<EnhancedDashboardOverviewProps> = ({ onSectionChange }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Platform Overview
        </h1>
        <p className="text-muted-foreground">
          Monitor and manage your therapy platform's performance and growth.
        </p>
      </div>

      {/* KPI Cards */}
      <DashboardKPICards onKPIClick={onSectionChange} />

      {/* Charts Section */}
      <DashboardCharts />

      {/* Activity Feed */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ActivityFeed />
        </div>
        
        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-primary-glow/10 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onSectionChange('therapists')}
                className="w-full text-left text-sm p-2 rounded bg-background hover:bg-muted transition-colors"
              >
                📋 Review Pending Therapists
              </button>
              <button 
                onClick={() => onSectionChange('support')}
                className="w-full text-left text-sm p-2 rounded bg-background hover:bg-muted transition-colors"
              >
                💬 Check Support Messages
              </button>
              <button 
                onClick={() => onSectionChange('payments')}
                className="w-full text-left text-sm p-2 rounded bg-background hover:bg-muted transition-colors"
              >
                💳 Review Failed Payments
              </button>
            </div>
          </div>

          {/* Platform Health */}
          <div className="bg-gradient-to-br from-success/10 to-green-400/10 border border-success/20 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">Platform Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">System Uptime</span>
                <span className="text-sm font-medium text-success">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Sessions</span>
                <span className="text-sm font-medium">1,247</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API Response</span>
                <span className="text-sm font-medium text-success">142ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};