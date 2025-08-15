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
  CreditCard
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
export const getSuperAdminNavigationItems = (): NavigationItem[] => [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    description: 'Platform overview and KPIs',
    roles: ['super_admin']
  },
  {
    id: 'therapists',
    label: 'Therapist Accounts',
    icon: Users,
    description: 'Manage practitioner accounts',
    roles: ['super_admin']
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    description: 'Manage client accounts',
    roles: ['super_admin']
  },
  {
    id: 'teams',
    label: 'Teams/Clinics',
    icon: Shield,
    description: 'Manage teams and clinics',
    roles: ['super_admin']
  },
  {
    id: 'payments',
    label: 'Stripe Payments',
    icon: CreditCard,
    description: 'Payment and subscription management',
    roles: ['super_admin']
  },
  {
    id: 'analytics',
    label: 'Reports & Analytics',
    icon: BarChart3,
    description: 'Platform-wide analytics',
    roles: ['super_admin']
  },
  {
    id: 'support',
    label: 'Support Messages',
    icon: MessageCircle,
    description: 'Customer support inbox',
    roles: ['super_admin']
  }
];

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
    roles: ['super_admin', 'practitioner', 'client'],
    permissions: ['can_view_analytics']
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    description: 'Appointment scheduling and management',
    roles: ['super_admin', 'practitioner', 'client']
  },
  {
    id: 'profiles',
    label: 'Profiles',
    icon: Users,
    description: 'Team and athlete profile management',
    roles: ['super_admin', 'practitioner']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    description: 'Generate and view performance reports',
    roles: ['super_admin', 'practitioner', 'client']
  },
  {
    id: 'programming',
    label: 'Programming',
    icon: Dumbbell,
    description: 'Create and manage training programs',
    roles: ['super_admin', 'practitioner', 'client']
  },
  {
    id: 'payment-packages',
    label: 'Payment Packages',
    icon: CreditCard,
    description: 'Subscription tiers and billing',
    roles: ['client']
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    icon: Shield,
    description: 'Platform management and oversight',
    roles: ['super_admin']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Application preferences and configuration',
    roles: ['super_admin', 'practitioner']
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: MessageCircle,
    description: 'Support and communication',
    roles: ['super_admin', 'practitioner', 'client']
  }
];

export const useFilteredNavigation = () => {
  const { profile, hasPermission, isRole } = useAuth();
  
  const getFilteredNavigation = () => {
    if (!profile) return [];
    
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

  const getSuperAdminFilteredNavigation = () => {
    if (!profile || profile.role !== 'super_admin') return [];
    return getSuperAdminNavigationItems();
  };
  
  return { 
    filteredNavigation: getFilteredNavigation(), 
    superAdminNavigation: getSuperAdminFilteredNavigation(),
    profile, 
    isRole 
  };
};