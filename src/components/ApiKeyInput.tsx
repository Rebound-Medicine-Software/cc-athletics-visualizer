
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, RefreshCw } from "lucide-react";

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  isLoading: boolean;
  currentApiKey?: string | null;
}

export const ApiKeyInput = ({ onApiKeySubmit, isLoading, currentApiKey }: ApiKeyInputProps) => {
  const [apiKey, setApiKey] = useState(currentApiKey || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <Card className="border-2 border-orange-200 bg-orange-50/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-gray-800 flex items-center justify-center gap-2">
          <Key className="w-6 h-6 text-orange-600" />
          CC Athletics API Connection
        </CardTitle>
        <p className="text-gray-600">
          Enter your CC Athletics API key to load live biomechanical data
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your CC Athletics API key"
              className="mt-1 border-orange-300 focus:border-orange-500 focus:ring-orange-500"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!apiKey.trim() || isLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading Data...
                </>
              ) : (
                'Connect & Load Data'
              )}
            </Button>
            
            {currentApiKey && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setApiKey("")}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Clear
              </Button>
            )}
          </div>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Your API key is stored locally and used to fetch live data every 5 minutes
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
