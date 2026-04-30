import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListSkeleton } from "@/components/dashboard/skeletons";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Activity, LogIn } from "lucide-react";
import type { RecentActivity } from "@/hooks/useHomeMetrics";
import { formatDistanceToNow } from "date-fns";

interface Props {
  data?: RecentActivity[];
  isLoading: boolean;
}

export const RecentActivityCard = ({ data, isLoading }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            inline
            compact
            icon={Activity}
            title="No recent activity"
            description="Logins, uploads, and bookings will appear here as your team uses the platform."
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                <div className="mt-0.5 p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950">
                  <LogIn className="h-3 w-3 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.user}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
