import React, { useState } from 'react';
import { ClientToday } from './client/ClientToday';
import { ClientMyProgress } from './client/ClientMyProgress';
import { ClientBookings } from './client/ClientBookings';
import { ClientReports } from './client/ClientReports';
import { ClientPrograms } from './client/ClientPrograms';
import { ClientMyTesting } from './client/ClientMyTesting';
import { ClientNotifications } from './client/ClientNotifications';
import { ClientMoreMenu } from './client/ClientMoreMenu';
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
  useRealtimeClientNotifications();

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <ClientToday onSectionChange={setActiveSection} />;
      case 'progress':
      case 'analytics':
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
      case 'messages':
        return <ClientNotifications />;
      case 'payment-packages':
        return <PaymentPackages />;
      case 'more':
        return <ClientMoreMenu onSectionChange={setActiveSection} />;
      default:
        return <ClientToday onSectionChange={setActiveSection} />;
    }
  };

  return (
    <div className="athlete-theme min-h-[100dvh] w-full bg-[hsl(222_45%_4%)] flex items-center justify-center md:p-6">
      {/* iPhone-style app shell — full-screen on mobile, centred phone frame on desktop */}
      <div
        className="
          relative flex flex-col bg-background text-foreground overflow-hidden
          w-full h-[100dvh]
          md:h-[min(900px,calc(100dvh-3rem))] md:w-[440px]
          md:rounded-[2.5rem] md:shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8),0_0_0_10px_hsl(222_30%_10%),0_0_0_11px_hsl(45_60%_55%/0.25)]
          md:ring-1 md:ring-white/5
        "
      >
        <header
          className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <AdminHeader role="client" />
        </header>

        <main
          className="flex-1 overflow-y-auto px-4 pt-5"
          style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
        >
          {renderContent()}
        </main>

        <ClientBottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>
    </div>
  );
};
