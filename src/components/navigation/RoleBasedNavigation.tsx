import React from 'react';
import { useAuth, UserTier } from '@/contexts/AuthContext';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { 
  Home, 
  BarChart3, 
  Calendar, 
  Users, 
  FileText, 
  Dumbbell, 
  Settings, 
  MessageCircle,
  Shield,
  CreditCard,
  Activity,
  Building2,
  HeadphonesIcon,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
  roles: ('super_admin' | 'organisation' | 'clinician' | 'client')[];
  permissions?: string[];
}

// Super Admin specific navigation
export const getSuperAdminNavigation = (): NavigationItem[] => [
  {
    id: 'overview',
    label: 'Overview',
    icon: Activity,
    description: 'Platform KPIs, analytics, and revenue overview',
    roles: ['super_admin']
  },
  {
    id: 'clinics',
    label: 'Clinics',
    icon: Building2,
    description: 'Organisation settings and clinic management',
    roles: ['super_admin']
  },
  {
    id: 'practitioners',
    label: 'Practitioners',
    icon: UserCheck,
    description: 'Manage practitioner accounts and credentials',
    roles: ['super_admin']
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users,
    description: 'CC Athletics teams from clinic API keys',
    roles: ['super_admin']
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    description: 'CC Athletics athletes and client data',
    roles: ['super_admin']
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    description: 'Platform MRR and payment flows',
    roles: ['super_admin']
  },
  {
    id: 'analytics',
    label: 'Reports & Analytics',
    icon: TrendingUp,
    description: 'Platform engagement and usage data',
    roles: ['super_admin']
  },
  {
    id: 'support',
    label: 'Customer Support',
    icon: HeadphonesIcon,
    description: 'Support center and messaging',
    roles: ['super_admin']
  }
];

// Standard navigation for all roles
export const getNavigationItems = (): NavigationItem[] => [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    description: 'Dashboard overview and social feeds',
    roles: ['super_admin', 'organisation', 'clinician', 'client']
  },
  {
    id: 'live-data',
    label: 'Live Data',
    icon: Activity,
    description: 'Real-time force plate data and measurements',
    roles: ['organisation', 'clinician']
  },
  {
    id: 'progress',
    label: 'My Progress',
    icon: TrendingUp,
    description: 'Latest results, baseline comparison and ranking',
    roles: ['client']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Performance metrics and data visualization',
    roles: ['organisation', 'clinician'],
    permissions: ['can_view_analytics']
  },
  {
    id: 'programming',
    label: 'My Programme',
    icon: Dumbbell,
    description: 'Your assigned training programme',
    roles: ['client']
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    description: 'Appointment scheduling and management',
    roles: ['organisation', 'clinician', 'client']
  },
  {
    id: 'testing',
    label: 'My Testing',
    icon: Activity,
    description: 'Last test, retest date and history',
    roles: ['client']
  },
  {
    id: 'profiles',
    label: 'Profiles',
    icon: Users,
    description: 'Team and athlete profile management',
    roles: ['organisation', 'clinician']
  },
  {
    id: 'reports',
    label: 'My Reports',
    icon: FileText,
    description: 'Your testing history and reports',
    roles: ['client']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    description: 'Generate and view performance reports',
    roles: ['organisation', 'clinician']
  },
  {
    id: 'programming',
    label: 'Programming',
    icon: Dumbbell,
    description: 'Create and manage training programs',
    roles: ['organisation', 'clinician']
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Updates from your coach and rankings',
    roles: ['client']
  },
  {
    id: 'payment-packages',
    label: 'Payment Packages',
    icon: CreditCard,
    description: 'Subscription tiers and billing',
    roles: ['client']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Application preferences and configuration',
    roles: ['organisation', 'clinician']
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: MessageCircle,
    description: 'Support and communication',
    roles: ['organisation', 'clinician', 'client']
  }
];

export const useFilteredNavigation = () => {
  const { profile, hasPermission, isRole } = useAuth();
  const { hasPermission: hasEffectivePermission, tier: effectiveTier } = useEffectiveTier();

  const getFilteredNavigation = () => {
    if (!profile) return [];

    // Super Admin gets special navigation
    if (profile.role === 'super_admin') {
      return getSuperAdminNavigation();
    }

    // Other roles get standard navigation
    return getNavigationItems().filter(item => {
      if (!item.roles.includes(profile.role)) return false;

      if (item.permissions && item.permissions.length > 0) {
        return item.permissions.some(permission => {
          // Use effective tier when impersonating or available
          if (effectiveTier) return hasEffectivePermission(permission as any);
          return hasPermission(permission as keyof UserTier);
        });
      }

      return true;
    });
  };

  return { filteredNavigation: getFilteredNavigation(), profile, isRole };
};