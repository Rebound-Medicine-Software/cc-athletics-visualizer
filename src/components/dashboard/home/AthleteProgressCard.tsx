import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { AthleteProgressSnapshot } from "@/hooks/useHomeRoleData";

interface Props {
  data?: AthleteProgressSnapshot;
  isLoading: boolean;
  onUploadData?: () => void;
}

export const AthleteProgressCard = ({ data, isLoading, onUploadData }: Props) => {
  const delta =
    (data?.testsThisMonth ?? 0) - (data?.testsLastMonth ?? 0);
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendTone =
    delta > 0
      ? "text-emerald-600"
      : delta < 0
      ? "text-rose-600"
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          Your progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !data?.athleteName ? (
          <EmptyState
            inline
            compact
            icon={Activity}
            title="No progress to show yet"
            description="Once your testing data is recorded it will appear here."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <div>
                <div className="text-3xl font-bold tabular-nums">
                  {data.testsThisMonth}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Tests this month
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${trendTone}`}>
                <TrendIcon className="w-4 h-4" />
                {delta > 0 ? `+${delta}` : delta} vs last month
              </div>
            </div>

            {data.lastTestDate && (
              <p className="text-xs text-muted-foreground">
                Last test {formatDistanceToNow(new Date(data.lastTestDate), { addSuffix: true })}
              </p>
            )}

            {data.recentTests.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent tests
                </h4>
                {data.recentTests.slice(0, 4).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{t.test_name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(t.test_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
