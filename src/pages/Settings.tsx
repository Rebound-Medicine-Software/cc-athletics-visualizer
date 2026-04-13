import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";
import { ApiKeysTab } from "@/components/settings/ApiKeysTab";
import { DemonstrationsTab } from "@/components/settings/DemonstrationsTab";

import { DataHousingTab } from "@/components/settings/DataHousingTab";
import { AthleteCredentialsTab } from "@/components/settings/AthleteCredentialsTab";
import { TierManagementTab } from "@/components/settings/TierManagementTab";
import { BrandingTab } from "@/components/settings/BrandingTab";

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "api-keys";
  const { profile } = useAuth();
  const { branding } = useBranding(profile?.team_id, profile?.role);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div 
      className="min-h-screen p-4"
      style={{
        background: branding?.primary_color 
          ? `linear-gradient(135deg, ${branding.primary_color}15, hsl(var(--background)), ${branding.secondary_color || branding.primary_color}10)`
          : 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--background)), hsl(var(--secondary) / 0.1))',
        fontFamily: branding?.font_family || 'Inter, system-ui, sans-serif'
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          </div>
        </div>

        <div 
          className="backdrop-blur-sm shadow-xl rounded-lg border-2"
          style={{
            backgroundColor: branding?.secondary_color ? `${branding.secondary_color}05` : 'hsl(var(--card) / 0.95)',
            borderColor: branding?.primary_color ? `${branding.primary_color}30` : 'hsl(var(--border))'
          }}
        >
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full justify-center border-b bg-transparent rounded-none h-auto p-0">
              <TabsTrigger 
                value="api-keys"
                className="flex-1 rounded-none"
                style={{
                  backgroundColor: 'transparent',
                  color: 'hsl(var(--foreground))',
                  borderBottom: '2px solid transparent',
                  ...(branding?.primary_color && {
                    '&[data-state=active]': {
                      backgroundColor: `${branding.primary_color}10`,
                      color: branding.primary_color,
                      borderBottomColor: branding.primary_color
                    }
                  })
                }}
              >
                Integrations
              </TabsTrigger>
              <TabsTrigger 
                value="demonstrations"
                className="flex-1 rounded-none"
                style={{
                  backgroundColor: 'transparent',
                  color: 'hsl(var(--foreground))',
                  borderBottom: '2px solid transparent'
                }}
              >
                Demonstrations
              </TabsTrigger>
              <TabsTrigger 
                value="data-housing"
                className="flex-1 rounded-none"
                style={{
                  backgroundColor: 'transparent',
                  color: 'hsl(var(--foreground))',
                  borderBottom: '2px solid transparent'
                }}
              >
                Data Housing
              </TabsTrigger>
              <TabsTrigger 
                value="athlete-credentials"
                className="flex-1 rounded-none"
                style={{
                  backgroundColor: 'transparent',
                  color: 'hsl(var(--foreground))',
                  borderBottom: '2px solid transparent'
                }}
              >
                Athlete Credentials
              </TabsTrigger>
              <TabsTrigger 
                value="tier-management"
                className="flex-1 rounded-none"
                style={{
                  backgroundColor: 'transparent',
                  color: 'hsl(var(--foreground))',
                  borderBottom: '2px solid transparent'
                }}
              >
                Tier Management
              </TabsTrigger>
              <TabsTrigger 
                value="branding"
                className="flex-1 rounded-none"
                style={{
                  backgroundColor: 'transparent',
                  color: 'hsl(var(--foreground))',
                  borderBottom: '2px solid transparent'
                }}
              >
                Branding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api-keys" className="p-6">
              <ApiKeysTab />
            </TabsContent>

            <TabsContent value="demonstrations" className="p-6">
              <DemonstrationsTab />
            </TabsContent>


            <TabsContent value="data-housing" className="p-6">
              <DataHousingTab />
            </TabsContent>

            <TabsContent value="athlete-credentials" className="p-6">
              <AthleteCredentialsTab />
            </TabsContent>

            <TabsContent value="tier-management" className="p-6">
              <TierManagementTab />
            </TabsContent>

            <TabsContent value="branding" className="p-6">
              <BrandingTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;