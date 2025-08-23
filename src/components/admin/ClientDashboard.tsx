import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { ClientOverview } from './client/ClientOverview';
import { ClientAnalytics } from './client/ClientAnalytics';
import { ClientBookings } from './client/ClientBookings';
import { ClientReports } from './client/ClientReports';
import { ClientPrograms } from './client/ClientPrograms';
import { PaymentPackages } from './client/PaymentPackages';
import { AdminHeader } from './AdminHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';

export const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState('home');
  const { profile } = useAuth();
  
  // Apply branding for client role
  useBranding(profile?.team_id, profile?.role);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <ClientOverview />;
      case 'analytics':
        return <ClientAnalytics />;
      case 'bookings':
        return <ClientBookings />;
      case 'reports':
        return <ClientReports />;
      case 'programming':
        return <ClientPrograms />;
      case 'payment-packages':
        return <PaymentPackages />;
      default:
        return <ClientOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          role="client"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 flex flex-col">
          <AdminHeader role="client" />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};