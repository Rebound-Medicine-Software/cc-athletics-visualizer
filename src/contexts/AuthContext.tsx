import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'organisation' | 'practitioner' | 'client';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  team_id?: string;
  tier_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface TeamBranding {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family?: string;
}

export interface UserTier {
  id: string;
  name: string;
  price_monthly: number;
  can_view_analytics: boolean;
  can_edit_programming: boolean;
  can_export_reports: boolean;
  can_adjust_sets_reps: boolean;
  max_bookings_per_month: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  teamBranding: TeamBranding | null;
  userTier: UserTier | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role?: UserRole) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof UserTier) => boolean;
  isRole: (role: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamBranding, setTeamBranding] = useState<TeamBranding | null>(null);
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, created_by:created_by(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        // Check if this is a clinician/client whose organization was deleted
        if (profileData.role === 'practitioner' || profileData.role === 'client') {
          if (!profileData.created_by) {
            console.error('Organization account was deleted');
            await supabase.auth.signOut();
            return;
          }
        }
        
        setProfile(profileData as UserProfile);

        // Fetch team branding if user has a team and user is not super admin
        if (profileData.team_id && profileData.role !== 'super_admin') {
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, name, logo_url, primary_color, secondary_color, accent_color, font_family')
            .eq('id', profileData.team_id)
            .maybeSingle();

          if (!teamError && teamData) {
            const brandingData = {
              ...teamData,
              font_family: teamData.font_family || 'Inter'
            };
            setTeamBranding(brandingData);
            // Apply team branding to CSS variables for dynamic theming
            applyTeamBranding(brandingData);
          }
        } else {
          // Reset to default branding for users without teams
          resetToDefaultBranding();
        }

        // Fetch user tier if they have one
        if (profileData.tier_id) {
          const { data: tierData, error: tierError } = await supabase
            .from('tiers')
            .select('*')
            .eq('id', profileData.tier_id)
            .maybeSingle();

          if (!tierError && tierData) {
            setUserTier(tierData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const applyTeamBranding = (branding: TeamBranding) => {
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: h = 0;
        }
        h /= 6;
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply branding variables to override default theme
    document.documentElement.style.setProperty('--primary', hexToHsl(branding.primary_color));
    document.documentElement.style.setProperty('--secondary', hexToHsl(branding.secondary_color));
    document.documentElement.style.setProperty('--accent', hexToHsl(branding.accent_color));
    document.documentElement.style.setProperty('--team-primary-color', hexToHsl(branding.primary_color));
    document.documentElement.style.setProperty('--team-secondary-color', hexToHsl(branding.secondary_color));
    document.documentElement.style.setProperty('--team-accent-color', hexToHsl(branding.accent_color));
    
    // Apply font family if specified
    if (branding.font_family && branding.font_family !== 'Inter') {
      document.documentElement.style.setProperty('--team-font-family', `'${branding.font_family}', sans-serif`);
      document.body.style.fontFamily = `'${branding.font_family}', sans-serif`;
    }
  };

  const resetToDefaultBranding = () => {
    // Reset to default Lovable theme
    document.documentElement.style.setProperty('--primary', '214 100% 50%');
    document.documentElement.style.setProperty('--secondary', '210 40% 96.1%');
    document.documentElement.style.setProperty('--accent', '45 100% 51%');
    document.documentElement.style.setProperty('--team-primary-color', '214 100% 50%');
    document.documentElement.style.setProperty('--team-secondary-color', '210 40% 96.1%');
    document.documentElement.style.setProperty('--team-accent-color', '45 100% 51%');
    document.documentElement.style.setProperty('--team-font-family', "'Inter', sans-serif");
    document.body.style.fontFamily = '';
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setTeamBranding(null);
          setUserTier(null);
          // Reset CSS variables to defaults
          resetToDefaultBranding();
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, role: UserRole = 'client') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role: role
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasPermission = (permission: keyof UserTier): boolean => {
    if (!userTier) return false;
    return Boolean(userTier[permission]);
  };

  const isRole = (role: UserRole): boolean => {
    return profile?.role === role;
  };

  const value = {
    user,
    session,
    profile,
    teamBranding,
    userTier,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    isRole,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};