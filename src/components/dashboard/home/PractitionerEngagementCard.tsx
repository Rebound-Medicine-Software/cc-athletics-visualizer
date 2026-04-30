import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/dashboard/skeletons";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Users, UserPlus } from "lucide-react";
import type { PractitionerEngagement } from "@/hooks/useHomeMetrics";
import { formatDistanceToNow } from "date-fns";

interface Props {
  data?: PractitionerEngagement[];
  isLoading: boolean;
}

export const PractitionerEngagementCard = ({ data, isLoading }: Props) => {
  const sorted = [...(data ?? [])].sort((a, b) => b.login_count_30d - a.login_count_30d);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-600" />
          Practitioner Engagement (30d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : sorted.length === 0 ? (
          <EmptyState
            inline
            compact
            icon={Users}
            title="No practitioners yet"
            description="Invite practitioners to start tracking engagement and activity."
            primaryAction={{
              label: "Invite practitioners",
              icon: UserPlus,
              onClick: () => window.location.assign("/settings"),
            }}
          />
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sorted.map((p) => (
              <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback>{(p.full_name ?? p.email)[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name || p.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.last_login
                      ? `Last login ${formatDistanceToNow(new Date(p.last_login), { addSuffix: true })}`
                      : "Never logged in"}
                  </p>
                </div>
                <Badge variant={p.login_count_30d > 5 ? "default" : "secondary"}>
                  {p.login_count_30d} logins
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
