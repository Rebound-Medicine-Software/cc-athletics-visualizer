import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ApiKeysTab } from "@/components/settings/ApiKeysTab";
import { DemonstrationsTab } from "@/components/settings/DemonstrationsTab";
import { StaffCredentialsTab } from "@/components/settings/StaffCredentialsTab";
import { DataHousingTab } from "@/components/settings/DataHousingTab";
import { AthleteCredentialsTab } from "@/components/settings/AthleteCredentialsTab";
import { TierManagementTab } from "@/components/settings/TierManagementTab";

const Settings = () => {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
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

        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-lg">
          <Tabs defaultValue="api-keys" className="w-full">
            <TabsList className="w-full justify-start border-b bg-transparent rounded-none h-auto p-0">
              <TabsTrigger 
                value="api-keys"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                API Keys
              </TabsTrigger>
              <TabsTrigger 
                value="demonstrations"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Demonstrations
              </TabsTrigger>
              <TabsTrigger 
                value="staff-credentials"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Staff Credentials
              </TabsTrigger>
              <TabsTrigger 
                value="data-housing"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Data Housing
              </TabsTrigger>
              <TabsTrigger 
                value="athlete-credentials"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Athlete Credentials
              </TabsTrigger>
              <TabsTrigger 
                value="tier-management"
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
              >
                Tier Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api-keys" className="p-6">
              <ApiKeysTab />
            </TabsContent>

            <TabsContent value="demonstrations" className="p-6">
              <DemonstrationsTab />
            </TabsContent>

            <TabsContent value="staff-credentials" className="p-6">
              <StaffCredentialsTab />
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
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;