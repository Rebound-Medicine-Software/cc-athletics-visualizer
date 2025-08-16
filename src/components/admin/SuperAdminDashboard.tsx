import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { EnhancedDashboardOverview } from './super-admin/EnhancedDashboardOverview';
import { UserManagement } from './super-admin/UserManagement';
import { TeamManagement } from './super-admin/TeamManagement';
import { PaymentManagement } from './super-admin/PaymentManagement';
import { SupportCenter } from './super-admin/SupportCenter';
import { AdminHeader } from './AdminHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const SuperAdminDashboard = () => {
  const { profile, loading, user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  console.log('SuperAdminDashboard - Profile:', profile);
  console.log('SuperAdminDashboard - Loading:', loading);
  console.log('SuperAdminDashboard - User:', user);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user at all, redirect to admin login
  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  // If user but no profile, show error message instead of redirecting
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile Loading Issue</h2>
          <p className="text-muted-foreground mb-4">
            You're authenticated but your profile couldn't be loaded.
          </p>
          <p className="text-sm text-muted-foreground">
            User ID: {user?.id}
          </p>
        </div>
      </div>
    );
  }

  const handleKPIClick = (kpi: string) => {
    // Handle KPI drill-down navigation
    switch (kpi) {
      case 'activeUsers':
        setActiveSection('therapists');
        break;
      case 'newUsers':
        setActiveSection('clients');
        break;
      case 'views':
        setActiveSection('analytics');
        break;
      default:
        setActiveSection('overview');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <EnhancedDashboardOverview onKPIClick={handleKPIClick} />;
      case 'therapists':
        return <UserManagement />;
      case 'clients':
        return <UserManagement />;
      case 'teams':
        return <TeamManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'analytics':
        return <EnhancedDashboardOverview onKPIClick={handleKPIClick} />;
      case 'support':
        return <SupportCenter />;
      default:
        return <EnhancedDashboardOverview onKPIClick={handleKPIClick} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar
          role="super_admin"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1">
          <AdminHeader role="super_admin" />
          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};