
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Activity } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }

    setIsLoading(true);
    
    try {
      // Store the API key in localStorage
      localStorage.setItem('cc-athletics-api-key', apiKey.trim());
      
      // Simulate API validation (you can add actual validation here)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Login successful!");
      navigate('/dashboard');
    } catch (error) {
      toast.error("Invalid API key. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              CC Athletics
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Advanced Testing Platform
          </p>
        </div>

        <Card className="shadow-lg border-gray-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-800 flex items-center justify-center gap-2">
              <Key className="w-6 h-6 text-blue-600" />
              API Access Required
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Enter your CC Athletics API key to access the reporting dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="mt-1"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={!apiKey.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Validating..." : "Access Dashboard"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Don't have an API key? Contact your administrator
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
