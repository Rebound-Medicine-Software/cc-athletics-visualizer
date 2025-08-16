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
  const { profile, isRole } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Allow access if user is authenticated (developer access)
  if (!profile) {
    return <Navigate to="/admin" replace />;
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