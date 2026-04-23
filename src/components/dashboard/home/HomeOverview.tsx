import { useAuth } from "@/contexts/AuthContext";
import { useHomeMetrics, usePractitionerEngagement, useRecentActivity } from "@/hooks/useHomeMetrics";
import { HomeKPICards } from "./HomeKPICards";
import { PractitionerEngagementCard } from "./PractitionerEngagementCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { SocialFeedCard } from "./SocialFeedCard";
import { PaymentsOverviewCard } from "./PaymentsOverviewCard";

export const HomeOverview = () => {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? null;
  const role = profile?.role ?? null;
  const isSuperAdmin = role === "super_admin";
  const isPractitioner = role === "practitioner" || role === "clinician";

  const { data: metrics, isLoading: metricsLoading } = useHomeMetrics(teamId, role);
  const { data: practitioners, isLoading: pracLoading } = usePractitionerEngagement(teamId, role);
  const { data: activity, isLoading: activityLoading } = useRecentActivity(teamId, role);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin
            ? "Platform-wide overview across all organisations."
            : "Overview of your team's activity, engagement, and growth."}
        </p>
      </div>

      {/* KPI Cards */}
      <HomeKPICards metrics={metrics} isLoading={metricsLoading} isSuperAdmin={isSuperAdmin} isPractitioner={isPractitioner} />

      {/* Main grid */}
      {isPractitioner ? (
        <div className="grid grid-cols-1 gap-4">
          <SocialFeedCard viewOnly />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PractitionerEngagementCard data={practitioners} isLoading={pracLoading} />
            <RecentActivityCard data={activity} isLoading={activityLoading} />
          </div>
          <div className="space-y-4">
            <PaymentsOverviewCard metrics={metrics} isLoading={metricsLoading} />
            <SocialFeedCard />
          </div>
        </div>
      )}
    </div>
  );
};
