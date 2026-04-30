import {
  LayoutDashboard, Building2, Users, UserCircle, Activity, BarChart3,
  CalendarRange, FileText, CreditCard, Plug, ShieldCheck, Bell,
  LifeBuoy, Settings, HeartPulse, LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: 'Overview' | 'Tenants' | 'Operations' | 'Governance';
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Global Dashboard',          icon: LayoutDashboard, group: 'Overview' },
  { id: 'health',        label: 'Platform Health',           icon: HeartPulse,      group: 'Overview' },
  { id: 'organisations', label: 'Organisations',             icon: Building2,       group: 'Tenants' },
  { id: 'practitioners', label: 'Users & Practitioners',     icon: Users,           group: 'Tenants' },
  { id: 'athletes',      label: 'Athletes Global Registry',  icon: UserCircle,      group: 'Tenants' },
  { id: 'live',          label: 'Live Testing Data Monitor', icon: Activity,        group: 'Operations' },
  { id: 'analytics',     label: 'Analytics Warehouse',       icon: BarChart3,       group: 'Operations' },
  { id: 'bookings',      label: 'Bookings Infrastructure',   icon: CalendarRange,   group: 'Operations' },
  { id: 'reports',       label: 'Reports & AI Engine',       icon: FileText,        group: 'Operations' },
  { id: 'billing',       label: 'Billing / Tiers / Revenue', icon: CreditCard,      group: 'Governance' },
  { id: 'integrations',  label: 'API & Integrations',        icon: Plug,            group: 'Governance' },
  { id: 'compliance',    label: 'Compliance / Audit Logs',   icon: ShieldCheck,     group: 'Governance' },
  { id: 'notifications', label: 'Notifications Centre',      icon: Bell,            group: 'Governance' },
  { id: 'support',       label: 'Support Desk',              icon: LifeBuoy,        group: 'Governance' },
  { id: 'settings',      label: 'Platform Settings',         icon: Settings,        group: 'Governance' },
];
