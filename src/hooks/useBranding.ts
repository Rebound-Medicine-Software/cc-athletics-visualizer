import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamBranding } from '@/contexts/AuthContext';
import ColorThief from 'colorthief';

export const useBranding = (teamId: string | null | undefined, userRole?: string) => {
  const [branding, setBranding] = useState<TeamBranding | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBranding = async () => {
    if (!teamId) return;
    
    // Skip branding for super_admin only
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
        
        // For client/athlete role, extract colors from team logo if available
        if (userRole === 'client' && data.logo_url) {
          await extractColorsFromLogo(data);
        } else {
          // For other roles, use existing team colors
          applyBrandingToDOM(data);
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractColorsFromLogo = async (teamData: TeamBranding & { font_family?: string }) => {
    try {
      const colorThief = new ColorThief();
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            // Get dominant color
            const dominantColor = colorThief.getColor(img);
            // Get color palette for variety
            const palette = colorThief.getPalette(img, 3);
            
            // Convert RGB arrays to hex
            const rgbToHex = (r: number, g: number, b: number) => 
              "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            
            const primaryHex = rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);
            const secondaryHex = palette[1] ? rgbToHex(palette[1][0], palette[1][1], palette[1][2]) : primaryHex;
            const accentHex = palette[2] ? rgbToHex(palette[2][0], palette[2][1], palette[2][2]) : primaryHex;
            
            // Create enhanced branding object with extracted colors
            const enhancedBranding = {
              ...teamData,
              primary_color: primaryHex,
              secondary_color: secondaryHex,
              accent_color: accentHex
            };
            
            applyBrandingToDOM(enhancedBranding);
            setBranding(enhancedBranding);
          } catch (colorError) {
            console.error('Error extracting colors:', colorError);
            // Fallback to team colors if extraction fails
            applyBrandingToDOM(teamData);
          }
          resolve();
        };
        
        img.onerror = () => {
          console.error('Error loading team logo for color extraction');
          // Fallback to team colors if image fails to load
          applyBrandingToDOM(teamData);
          resolve();
        };
        
        img.src = teamData.logo_url!;
      });
    } catch (error) {
      console.error('Error in extractColorsFromLogo:', error);
      // Fallback to team colors
      applyBrandingToDOM(teamData);
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
    root.style.setProperty('--primary', '214 58% 27%');
    root.style.setProperty('--secondary', '216 45% 20%');
    root.style.setProperty('--accent', '38 92% 50%');
    
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