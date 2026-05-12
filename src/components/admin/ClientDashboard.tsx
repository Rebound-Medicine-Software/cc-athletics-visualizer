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
import { useRealtimeClientNotifications } from '@/hooks/useRealtimeClientNotifications';
import { ClientBottomNav } from './client/ClientBottomNav';

export const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState('home');
  const { profile } = useAuth();
  const { teamId: effectiveTeamId, isImpersonating } = useEffectiveTeamId();

  useBranding(effectiveTeamId, isImpersonating ? 'organisation' : profile?.role);
  // Realtime: live PB / leader / retest / streak toasts and badge updates
  useRealtimeClientNotifications();

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
      <div className="athlete-theme min-h-[100dvh] flex w-full bg-background text-foreground">
        {/* Sidebar: hidden on mobile — replaced by bottom tab bar */}
        <div className="hidden md:flex">
          <AdminSidebar
            role="client"
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <div
            className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <AdminHeader role="client" />
          </div>
          <div
            className="flex-1 px-4 md:px-6 pt-5 md:pt-8 max-w-3xl mx-auto w-full"
            style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
          >
            {renderContent()}
          </div>
        </main>
        <ClientBottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>
    </SidebarProvider>
  );
};
