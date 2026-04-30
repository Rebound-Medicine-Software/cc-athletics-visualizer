import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ListSkeleton } from "@/components/dashboard/skeletons";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { AthleteNeedingAttention } from "@/hooks/useHomeRoleData";

interface Props {
  data?: AthleteNeedingAttention[];
  isLoading: boolean;
  onAddAthlete?: () => void;
}

export const AthletesNeedingAttentionCard = ({ data, isLoading, onAddAthlete }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Athletes needing attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            inline
            compact
            icon={Users}
            title="Everyone is up to date"
            description="No athletes have outstanding consents or stale tests."
            primaryAction={
              onAddAthlete
                ? { label: "Add athlete", onClick: onAddAthlete }
                : undefined
            }
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.map((a) => {
              const reason =
                a.consent_status === "pending"
                  ? "Consent pending"
                  : a.last_test_date
                  ? `Last tested ${formatDistanceToNow(new Date(a.last_test_date), { addSuffix: true })}`
                  : "No tests recorded";
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 border border-border/40"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={a.avatar_url ?? undefined} />
                    <AvatarFallback>{a.name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{reason}</p>
                  </div>
                  {a.consent_status === "pending" && (
                    <Badge variant="outline" className="shrink-0 text-amber-700 border-amber-300">
                      Consent
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
