import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ControlCentreLayout } from './ControlCentreLayout';
import './theme.css';

import { GlobalDashboard } from './pages/GlobalDashboard';
import { Health } from './pages/Health';
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
  health: Health,
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

const VALID_SECTIONS = Object.keys(PAGES);

export const ControlCentre: React.FC = () => {
  // Auth + super_admin role gating handled centrally by
  // <ProtectedRoute><SuperAdminGate>...</SuperAdminGate></ProtectedRoute> in App.tsx.
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const initial = sectionParam && VALID_SECTIONS.includes(sectionParam) ? sectionParam : 'dashboard';
  const [active, setActive] = useState(initial);

  // Sync URL -> state (e.g. command palette navigates while already on /control-centre)
  useEffect(() => {
    if (sectionParam && VALID_SECTIONS.includes(sectionParam) && sectionParam !== active) {
      setActive(sectionParam);
    } else if (sectionParam && !VALID_SECTIONS.includes(sectionParam)) {
      // Invalid -> fallback to dashboard and clean URL
      setActive('dashboard');
      const next = new URLSearchParams(searchParams);
      next.delete('section');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionParam]);

  const handleNavigate = useCallback(
    (id: string) => {
      const target = VALID_SECTIONS.includes(id) ? id : 'dashboard';
      setActive(target);
      const next = new URLSearchParams(searchParams);
      if (target === 'dashboard') next.delete('section');
      else next.set('section', target);
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const Page = PAGES[active] || GlobalDashboard;

  return (
    <ControlCentreLayout active={active} onNavigate={handleNavigate}>
      <Page />
    </ControlCentreLayout>
  );
};

export default ControlCentre;
