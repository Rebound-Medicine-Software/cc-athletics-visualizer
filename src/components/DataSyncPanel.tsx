
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle, Key } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { formatDistanceToNow } from "date-fns";

export const DataSyncPanel = () => {
  const { data, isLoading, syncData, lastSyncTime, error } = useSupabaseData();

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const isApiKeyError = error?.includes('CC_ATHLETICS_API_KEY not configured') || error?.includes('Invalid or missing API key');

  return (
    <Card className="border-2 border-green-200 bg-green-50/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl text-gray-800 flex items-center justify-center gap-2">
          <Database className="w-6 h-6 text-green-600" />
          Supabase Data Hub
        </CardTitle>
        <p className="text-gray-600">
          Live force plate data stored in your database
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isApiKeyError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">API Key Required</span>
            </div>
            <p className="text-xs text-orange-700 mb-2">
              Add your CC Athletics API key in Supabase:
            </p>
            <ol className="text-xs text-orange-700 space-y-1 ml-4">
              <li>1. Go to your Supabase project dashboard</li>
              <li>2. Navigate to Settings → Edge Functions</li>
              <li>3. Click "Manage secrets"</li>
              <li>4. Add secret: CC_ATHLETICS_API_KEY</li>
            </ol>
          </div>
        )}

        {error && !isApiKeyError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Sync Error</span>
            </div>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Last sync:</span>
            <Badge variant="outline" className="text-xs">
              {formatLastSync(lastSyncTime)}
            </Badge>
          </div>
          
          {data && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <Badge className="bg-green-100 text-green-800">
                {data.length} records
              </Badge>
            </div>
          )}
        </div>

        <Button
          onClick={syncData}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Syncing Data...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Data automatically syncs every 24 hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
