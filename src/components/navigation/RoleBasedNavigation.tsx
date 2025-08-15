import React from 'react';
import { useAuth, UserTier } from '@/contexts/AuthContext';
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
  roles: ('super_admin' | 'practitioner' | 'client')[];
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
    id: 'therapists',
    label: 'Therapist Accounts',
    icon: UserCheck,
    description: 'Manage Consumer 1 users (approve/revoke)',
    roles: ['super_admin']
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    description: 'Manage Consumer 2 users',
    roles: ['super_admin']
  },
  {
    id: 'teams',
    label: 'Teams/Clinics',
    icon: Building2,
    description: 'Manage branding settings, logos, colors',
    roles: ['super_admin']
  },
  {
    id: 'payments',
    label: 'Stripe Payments',
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
    label: 'Support Messages',
    icon: HeadphonesIcon,
    description: 'Inbox for Consumer 1 messages',
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
    roles: ['super_admin', 'practitioner', 'client']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Performance metrics and data visualization',
    roles: ['practitioner', 'client'],
    permissions: ['can_view_analytics']
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    description: 'Appointment scheduling and management',
    roles: ['practitioner', 'client']
  },
  {
    id: 'profiles',
    label: 'Profiles',
    icon: Users,
    description: 'Team and athlete profile management',
    roles: ['practitioner']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    description: 'Generate and view performance reports',
    roles: ['practitioner', 'client']
  },
  {
    id: 'programming',
    label: 'Programming',
    icon: Dumbbell,
    description: 'Create and manage training programs',
    roles: ['practitioner', 'client']
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
    roles: ['practitioner']
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: MessageCircle,
    description: 'Support and communication',
    roles: ['practitioner', 'client']
  }
];

export const useFilteredNavigation = () => {
  const { profile, hasPermission, isRole } = useAuth();
  
  const getFilteredNavigation = () => {
    if (!profile) return [];
    
    // Super Admin gets special navigation
    if (profile.role === 'super_admin') {
      return getSuperAdminNavigation();
    }
    
    // Other roles get standard navigation
    return getNavigationItems().filter(item => {
      // Check if user role is allowed
      if (!item.roles.includes(profile.role)) return false;
      
      // Check permissions if specified
      if (item.permissions && item.permissions.length > 0) {
        return item.permissions.some(permission => 
          hasPermission(permission as keyof UserTier)
        );
      }
      
      return true;
    });
  };
  
  return { filteredNavigation: getFilteredNavigation(), profile, isRole };
};