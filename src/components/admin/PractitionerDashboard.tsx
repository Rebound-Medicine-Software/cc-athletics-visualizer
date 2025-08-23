import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { TeamOverview } from './practitioner/TeamOverview';
import { TeamAnalytics } from './practitioner/TeamAnalytics';
import { BookingManagement } from './practitioner/BookingManagement';
import { ProfileManagement } from './practitioner/ProfileManagement';
import { ReportManagement } from './practitioner/ReportManagement';
import { ProgramManagement } from './practitioner/ProgramManagement';
import { AdminHeader } from './AdminHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/hooks/useBranding';

export const PractitionerDashboard = () => {
  const [activeSection, setActiveSection] = useState('home');
  const { profile } = useAuth();
  
  // Apply branding for practitioner/organization role
  useBranding(profile?.team_id, profile?.role);

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <TeamOverview />;
      case 'analytics':
        return <TeamAnalytics />;
      case 'bookings':
        return <BookingManagement />;
      case 'profiles':
        return <ProfileManagement />;
      case 'reports':
        return <ReportManagement />;
      case 'programming':
        return <ProgramManagement />;
      default:
        return <TeamOverview />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          role="practitioner"
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 flex flex-col">
          <AdminHeader role="practitioner" />
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};