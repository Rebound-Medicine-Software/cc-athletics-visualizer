import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { DashboardOverview } from './super-admin/DashboardOverview';
import { UserManagement } from './super-admin/UserManagement';
import { TeamManagement } from './super-admin/TeamManagement';
import { PaymentManagement } from './super-admin/PaymentManagement';
import { SupportCenter } from './super-admin/SupportCenter';
import { AdminHeader } from './AdminHeader';

export const SuperAdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'teams':
        return <TeamManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'support':
        return <SupportCenter />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          role="super_admin"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 flex flex-col">
          <AdminHeader role="super_admin" />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};