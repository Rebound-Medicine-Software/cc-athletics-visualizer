import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { EnhancedDashboardOverview } from './super-admin/EnhancedDashboardOverview';
import { TherapistAccountsSection } from './super-admin/TherapistAccountsSection';
import { ClientsSection } from './super-admin/ClientsSection';
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
        return <EnhancedDashboardOverview onSectionChange={setActiveSection} />;
      case 'therapists':
        return <TherapistAccountsSection />;
      case 'clients':
        return <ClientsSection />;
      case 'teams':
        return <TeamManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'analytics':
        return <UserManagement />;
      case 'support':
        return <SupportCenter />;
      default:
        return <EnhancedDashboardOverview onSectionChange={setActiveSection} />;
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