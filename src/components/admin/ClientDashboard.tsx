import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { ClientToday } from './client/ClientToday';
import { ClientMyProgress } from './client/ClientMyProgress';
import { ClientBookings } from './client/ClientBookings';
import { ClientReports } from './client/ClientReports';
import { ClientPrograms } from './client/ClientPrograms';
import { ClientMyTesting } from './client/ClientMyTesting';
import { ClientNotifications } from './client/ClientNotifications';
import { PaymentPackages } from './client/PaymentPackages';
import { AdminHeader } from './AdminHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';

export const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState('home');
  const { profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();

  useBranding(effectiveTeamId, isImpersonating ? 'organisation' : profile?.role);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <ClientToday onSectionChange={setActiveSection} />;
      case 'progress':
      case 'analytics': // legacy alias
        return <ClientMyProgress />;
      case 'programming':
        return <ClientPrograms />;
      case 'bookings':
        return <ClientBookings />;
      case 'reports':
        return <ClientReports />;
      case 'testing':
        return <ClientMyTesting />;
      case 'notifications':
        return <ClientNotifications />;
      case 'payment-packages':
        return <PaymentPackages />;
      default:
        return <ClientToday onSectionChange={setActiveSection} />;
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
          <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">{renderContent()}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};
