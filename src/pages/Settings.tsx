import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Key, CheckCircle, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [currentApiKey, setCurrentApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyValidated, setApiKeyValidated] = useState(false);

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

    // Load current API key
    const storedApiKey = localStorage.getItem('cc-athletics-api-key');
    if (storedApiKey) {
      setCurrentApiKey(storedApiKey);
      setApiKey(storedApiKey);
      setApiKeyValidated(true);
    }
  }, [navigate]);

  const validateApiKey = async () => {
    if (!apiKey) {
      toast.error("Please enter your CC Athletics API key");
      return;
    }

    setIsValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-api-key', {
        body: { apiKey }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error("Failed to validate API key. Please try again.");
        setIsValidating(false);
        return;
      }

      if (data.valid) {
        setApiKeyValidated(true);
        toast.success(`API key validated successfully! Found ${data.teamsCount} teams.`);
      } else {
        setApiKeyValidated(false);
        toast.error(data.error || "Invalid API key. Please check your credentials.");
      }
    } catch (error) {
      console.error('API validation error:', error);
      toast.error("Network error. Unable to validate API key.");
      setApiKeyValidated(false);
    } finally {
      setIsValidating(false);
    }
  };

  const saveApiKey = () => {
    if (!apiKeyValidated) {
      toast.error("Please validate your API key first");
      return;
    }

    localStorage.setItem('cc-athletics-api-key', apiKey);
    setCurrentApiKey(apiKey);
    toast.success("API key updated successfully!");
  };

  const clearApiKey = () => {
    localStorage.removeItem('cc-athletics-api-key');
    setCurrentApiKey("");
    setApiKey("");
    setApiKeyValidated(false);
    toast.success("API key cleared successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
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

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-6 h-6" />
              CC Athletics API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center mb-6">
              <img 
                src="/lovable-uploads/8fca559f-901e-4e29-9b01-018c2c7634ba.png" 
                alt="CC Athletics Logo" 
                className="w-20 h-20 mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold">Manage your CC Athletics connection</h3>
              <p className="text-gray-600">Update or validate your API key for force plate data sync</p>
            </div>

            {currentApiKey && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">API Key Currently Configured</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Your CC Athletics account is connected and syncing data.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key">CC Athletics API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your CC Athletics API key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setApiKeyValidated(false);
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={validateApiKey}
                    disabled={!apiKey || isValidating}
                    variant="outline"
                  >
                    {isValidating ? (
                      "Validating..."
                    ) : apiKeyValidated ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      "Validate"
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  You can find your API key in your CC Athletics dashboard under Settings → API Access
                </p>
              </div>

              {apiKeyValidated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">API Key Validated Successfully!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your CC Athletics account is ready to sync data.
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={saveApiKey} 
                  disabled={!apiKeyValidated}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save API Key
                </Button>
                
                {currentApiKey && (
                  <Button 
                    onClick={clearApiKey}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Clear API Key
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;