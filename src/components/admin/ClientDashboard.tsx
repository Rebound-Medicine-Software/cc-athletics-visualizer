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
import { ClientHeader } from './client/ClientHeader';
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
    <div
      className="athlete-theme min-h-[100dvh] w-full flex items-center justify-center md:p-8"
      style={{
        background:
          'radial-gradient(circle at 18% 4%, hsl(192 87% 65% / 0.18), transparent 32%),' +
          'radial-gradient(circle at 86% 14%, hsl(42 65% 56% / 0.13), transparent 28%),' +
          'radial-gradient(circle at 42% 100%, hsl(145 65% 60% / 0.12), transparent 34%),' +
          'linear-gradient(135deg, #04080d 0%, #0c1722 48%, #071018 100%)',
      }}
    >
      {/* Premium phone shell — physical device feel on desktop, edge-to-edge on mobile */}
      <div
        className="
          relative w-full h-[100dvh]
          md:h-[min(932px,calc(100dvh-4rem))] md:w-[430px]
          md:rounded-[58px] md:p-[13px]
          md:bg-[linear-gradient(145deg,#111820,#303942_45%,#090d12_100%)]
          md:border md:border-white/20
          md:shadow-[0_40px_120px_rgba(0,0,0,0.72),inset_0_1px_1px_rgba(255,255,255,0.28)]
        "
      >
        {/* Inner bezel ring (desktop only) */}
        <div className="hidden md:block absolute inset-[6px] rounded-[52px] border border-white/[0.08] pointer-events-none z-20" />

        {/* Notch (desktop only) */}
        <div className="hidden md:block absolute z-30 top-3 left-1/2 -translate-x-1/2 w-32 h-[34px] rounded-b-[20px] bg-[#020407] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]" />

        {/* Screen */}
        <div className="relative h-full w-full md:rounded-[46px] overflow-hidden bg-background flex flex-col">
          {/* Header — flush, glass over content */}
          <header
            className="absolute top-0 inset-x-0 z-30 backdrop-blur-xl bg-background/55 md:pt-[40px]"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <ClientHeader />
          </header>

          {/* Scrollable content */}
          <main
            className="scroll-clean flex-1 overflow-y-auto overflow-x-hidden px-4"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 76px)',
              paddingBottom: 'calc(124px + env(safe-area-inset-bottom))',
              maxWidth: '100%',
            }}
          >
            {renderContent()}
          </main>

          <ClientBottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>
      </div>
    </div>
  );
};
