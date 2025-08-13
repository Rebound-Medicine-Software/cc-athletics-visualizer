import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Palette, Upload, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BrandingTab = () => {
  const { profile, teamBranding, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [brandingForm, setBrandingForm] = useState({
    name: teamBranding?.name || '',
    logo_url: teamBranding?.logo_url || '',
    primary_color: teamBranding?.primary_color || '#3B82F6',
    secondary_color: teamBranding?.secondary_color || '#1E40AF',
    accent_color: teamBranding?.accent_color || '#F59E0B'
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
          primary_color: brandingForm.primary_color,
          secondary_color: brandingForm.secondary_color,
          accent_color: brandingForm.accent_color
        })
        .eq('id', profile.team_id);

      if (error) throw error;

      // Apply new branding immediately
      document.documentElement.style.setProperty('--team-primary', brandingForm.primary_color);
      document.documentElement.style.setProperty('--team-secondary', brandingForm.secondary_color);
      document.documentElement.style.setProperty('--team-accent', brandingForm.accent_color);

      await refreshProfile();
      toast({ title: 'Success', description: 'Team branding updated successfully' });
    } catch (error) {
      console.error('Error updating branding:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update team branding' });
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (field: string, value: string) => {
    setBrandingForm(prev => ({ ...prev, [field]: value }));
    // Apply color immediately for preview
    document.documentElement.style.setProperty(`--team-${field.replace('_color', '')}`, value);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={brandingForm.name}
                onChange={(e) => setBrandingForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your team name"
              />
            </div>

            <div>
              <Label htmlFor="logo-url">Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  id="logo-url"
                  value={brandingForm.logo_url}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
                <Button variant="outline" size="icon">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Brand Colors</Label>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="primary-color" className="text-xs">Primary</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="primary-color"
                      value={brandingForm.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="w-10 h-10 border rounded cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primary_color}
                      onChange={(e) => handleColorChange('primary_color', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="secondary-color" className="text-xs">Secondary</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="secondary-color"
                      value={brandingForm.secondary_color}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="w-10 h-10 border rounded cursor-pointer"
                    />
                    <Input
                      value={brandingForm.secondary_color}
                      onChange={(e) => handleColorChange('secondary_color', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="accent-color" className="text-xs">Accent</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="accent-color"
                      value={brandingForm.accent_color}
                      onChange={(e) => handleColorChange('accent_color', e.target.value)}
                      className="w-10 h-10 border rounded cursor-pointer"
                    />
                    <Input
                      value={brandingForm.accent_color}
                      onChange={(e) => handleColorChange('accent_color', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Brand Preview</Label>
              <Card className="p-4 border-2" style={{ borderColor: brandingForm.accent_color }}>
                <div className="flex items-center space-x-3 mb-4">
                  {brandingForm.logo_url && (
                    <img 
                      src={brandingForm.logo_url} 
                      alt="Team Logo" 
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <h3 className="font-semibold" style={{ color: brandingForm.primary_color }}>
                      {brandingForm.name || 'Your Team Name'}
                    </h3>
                    <p className="text-sm" style={{ color: brandingForm.secondary_color }}>
                      Professional Performance Center
                    </p>
                  </div>
                </div>
                <Button 
                  style={{ 
                    backgroundColor: brandingForm.primary_color,
                    borderColor: brandingForm.primary_color 
                  }}
                  className="text-white"
                >
                  Example Button
                </Button>
              </Card>
            </div>
          </div>
        </div>

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