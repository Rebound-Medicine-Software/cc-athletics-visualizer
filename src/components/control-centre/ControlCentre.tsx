import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ControlCentreLayout } from './ControlCentreLayout';
import './theme.css';

import { GlobalDashboard } from './pages/GlobalDashboard';
import { Organisations } from './pages/Organisations';
import { Practitioners } from './pages/Practitioners';
import { Athletes } from './pages/Athletes';
import { LiveMonitor } from './pages/LiveMonitor';
import { Analytics } from './pages/Analytics';
import { Bookings } from './pages/Bookings';
import { Reports } from './pages/Reports';
import { Billing } from './pages/Billing';
import { Integrations } from './pages/Integrations';
import { Compliance } from './pages/Compliance';
import { Notifications } from './pages/Notifications';
import { Support } from './pages/Support';
import { Settings as PlatformSettings } from './pages/Settings';

const PAGES: Record<string, React.ComponentType> = {
  dashboard: GlobalDashboard,
  organisations: Organisations,
  practitioners: Practitioners,
  athletes: Athletes,
  live: LiveMonitor,
  analytics: Analytics,
  bookings: Bookings,
  reports: Reports,
  billing: Billing,
  integrations: Integrations,
  compliance: Compliance,
  notifications: Notifications,
  support: Support,
  settings: PlatformSettings,
};

export const ControlCentre: React.FC = () => {
  const { profile, loading } = useAuth();
  const [active, setActive] = useState('dashboard');

  if (loading) {
    return (
      <div className="control-centre min-h-screen flex items-center justify-center">
        <div className="cc-pulse" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/admin" replace />;
  if (profile.role !== 'super_admin') return <Navigate to="/auth" replace />;

  const Page = PAGES[active] || GlobalDashboard;

  return (
    <ControlCentreLayout active={active} onNavigate={setActive}>
      <Page />
    </ControlCentreLayout>
  );
};

export default ControlCentre;
