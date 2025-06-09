
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, Clock, CheckCircle } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { formatDistanceToNow } from "date-fns";

export const DataSyncPanel = () => {
  const { data, isLoading, syncData, lastSyncTime } = useSupabaseData();

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    return formatDistanceToNow(date, { addSuffix: true });
  };

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
