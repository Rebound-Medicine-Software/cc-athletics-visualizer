
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Key, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const validateApiKey = async (key: string) => {
    try {
      console.log('Validating API key via Supabase Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('validate-api-key', {
        body: { apiKey: key }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error('Failed to validate API key. Please try again.');
      }

      console.log('Validation response:', data);

      if (!data.valid) {
        throw new Error(data.error || 'Invalid API key');
      }

      return data.valid;
    } catch (error) {
      console.error('API validation error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  };

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await validateApiKey(apiKey);
      localStorage.setItem('cc-athletics-api-key', apiKey);
      toast.success("API key validated successfully!");
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Activity className="w-12 h-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Evolve Physiotherapy
          </CardTitle>
          <p className="text-gray-600">
            Enter your CC Athletics API key to access the dashboard
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your CC Athletics API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-white/90"
            />
          </div>
          
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Validating..." : "Access Dashboard"}
          </Button>
          
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-gray-600"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
