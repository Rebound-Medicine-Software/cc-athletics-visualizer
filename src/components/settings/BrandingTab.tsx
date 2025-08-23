import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BrandingForm } from '@/components/shared/BrandingForm';

export const BrandingTab = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamBranding, setTeamBranding] = useState<any>(null);
  
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    logo_url: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#F59E0B',
    fontFamily: 'Inter'
  });

  useEffect(() => {
    fetchTeamBranding();
  }, [profile?.team_id]);

  const fetchTeamBranding = async () => {
    if (!profile?.team_id) {
      console.log('No team_id found for profile:', profile);
      return;
    }
    
    try {
      console.log('Fetching team branding for team_id:', profile.team_id);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, primary_color, secondary_color, accent_color, font_family')
        .eq('id', profile.team_id)
        .single();

      if (error) {
        console.error('Error fetching team branding:', error);
        return;
      }

      if (data) {
        console.log('Found team branding data:', data);
        setTeamBranding(data);
        setBrandingForm({
          name: data.name || '',
          logo_url: data.logo_url || '',
          primaryColor: data.primary_color || '#3B82F6',
          secondaryColor: data.secondary_color || '#1E40AF',
          accentColor: data.accent_color || '#F59E0B',
          fontFamily: data.font_family || 'Inter'
        });
      }
    } catch (error) {
      console.error('Error fetching team branding:', error);
    }
  };

  const handleSave = async () => {
    if (!profile?.team_id) {
      toast({ variant: 'destructive', title: 'Error', description: 'No team associated with your account' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: brandingForm.name,
          logo_url: brandingForm.logo_url,
          primary_color: brandingForm.primaryColor,
          secondary_color: brandingForm.secondaryColor,
          accent_color: brandingForm.accentColor,
          font_family: brandingForm.fontFamily
        })
        .eq('id', profile.team_id);

      if (error) throw error;

      // Apply new branding immediately using hex to HSL conversion
      const root = document.documentElement;
      const hexToHsl = (hex: string): string => {
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
          return '214 100% 50%';
        }
      };

      if (brandingForm.primaryColor) {
        const hsl = hexToHsl(brandingForm.primaryColor);
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--team-primary', hsl);
      }
      
      if (brandingForm.secondaryColor) {
        const hsl = hexToHsl(brandingForm.secondaryColor);
        root.style.setProperty('--secondary', hsl);
        root.style.setProperty('--team-secondary', hsl);
      }
      
      if (brandingForm.accentColor) {
        const hsl = hexToHsl(brandingForm.accentColor);
        root.style.setProperty('--accent', hsl);
        root.style.setProperty('--team-accent', hsl);
      }

      if (brandingForm.fontFamily) {
        root.style.setProperty('--team-font-family', `'${brandingForm.fontFamily}', sans-serif`);
        document.body.style.fontFamily = `'${brandingForm.fontFamily}', sans-serif`;
      }

      await refreshProfile();
      toast({ title: 'Success', description: 'Team branding updated successfully' });
    } catch (error) {
      console.error('Error updating branding:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update team branding' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-6 h-6" />
          Team Branding
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize your team's visual identity across the platform
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <BrandingForm
          brandingForm={brandingForm}
          setBrandingForm={setBrandingForm}
        />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};