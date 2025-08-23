import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamBranding } from '@/contexts/AuthContext';

export const useBranding = (teamId: string | null | undefined, userRole?: string) => {
  const [branding, setBranding] = useState<TeamBranding | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBranding = async () => {
    if (!teamId) return;
    
    // Only apply branding for organization and practitioner roles
    if (userRole === 'super_admin') {
      resetBranding();
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, primary_color, secondary_color, accent_color, font_family')
        .eq('id', teamId)
        .maybeSingle();

      if (!error && data) {
        setBranding(data);
        applyBrandingToDOM(data);
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyBrandingToDOM = (brandingData: TeamBranding & { font_family?: string }) => {
    if (!brandingData) return;

    const root = document.documentElement;
    
    // Apply colors as CSS variables
    if (brandingData.primary_color) {
      // Convert hex to HSL for Tailwind compatibility
      const hsl = hexToHsl(brandingData.primary_color);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--team-primary', hsl);
      }
    }
    
    if (brandingData.secondary_color) {
      const hsl = hexToHsl(brandingData.secondary_color);
      if (hsl) {
        root.style.setProperty('--secondary', hsl);
        root.style.setProperty('--team-secondary', hsl);
      }
    }
    
    if (brandingData.accent_color) {
      const hsl = hexToHsl(brandingData.accent_color);
      if (hsl) {
        root.style.setProperty('--accent', hsl);
        root.style.setProperty('--team-accent', hsl);
      }
    }

    // Apply font family
    if (brandingData.font_family) {
      root.style.setProperty('--team-font-family', `'${brandingData.font_family}', sans-serif`);
      document.body.style.fontFamily = `'${brandingData.font_family}', sans-serif`;
    }
  };

  const resetBranding = () => {
    const root = document.documentElement;
    
    // Reset to original Lovable defaults
    root.style.setProperty('--primary', '214 100% 50%');
    root.style.setProperty('--secondary', '210 40% 96.1%');
    root.style.setProperty('--accent', '45 100% 51%');
    
    root.style.removeProperty('--team-primary');
    root.style.removeProperty('--team-secondary');
    root.style.removeProperty('--team-accent');
    root.style.removeProperty('--team-font-family');
    
    document.body.style.fontFamily = '';
    setBranding(null);
  };

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): string | null => {
    try {
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
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchBranding();
    
    return () => {
      // Don't reset branding on unmount to maintain state across navigation
    };
  }, [teamId, userRole]);

  return {
    branding,
    loading,
    refreshBranding: fetchBranding,
    resetBranding,
    applyBranding: applyBrandingToDOM
  };
};