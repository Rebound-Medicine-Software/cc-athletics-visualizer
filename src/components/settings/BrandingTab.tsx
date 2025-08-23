import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BrandingForm } from '@/components/shared/BrandingForm';

export const BrandingTab = () => {
  const { profile, teamBranding, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [brandingForm, setBrandingForm] = useState({
    name: teamBranding?.name || '',
    logo_url: teamBranding?.logo_url || '',
    primaryColor: teamBranding?.primary_color || '#3B82F6',
    secondaryColor: teamBranding?.secondary_color || '#1E40AF',
    accentColor: teamBranding?.accent_color || '#F59E0B',
    fontFamily: teamBranding?.font_family || 'Inter'
  });

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

      // Apply new branding immediately
      const root = document.documentElement;
      root.style.setProperty('--team-primary', brandingForm.primaryColor);
      root.style.setProperty('--team-secondary', brandingForm.secondaryColor);
      root.style.setProperty('--team-accent', brandingForm.accentColor);
      if (brandingForm.fontFamily) {
        root.style.setProperty('--team-font-family', brandingForm.fontFamily);
        document.body.style.fontFamily = brandingForm.fontFamily + ', sans-serif';
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