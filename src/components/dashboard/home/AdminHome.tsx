import { useNavigate } from "react-router-dom";
import { UserPlus, Users, FileText, Calendar, Upload, BarChart3 } from "lucide-react";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { useHomeMetrics, usePractitionerEngagement, useRecentActivity } from "@/hooks/useHomeMetrics";
import { useTodayBookings } from "@/hooks/useHomeRoleData";
import { HomeKPICards } from "./HomeKPICards";
import { PractitionerEngagementCard } from "./PractitionerEngagementCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { SocialFeedCard } from "./SocialFeedCard";
import { PaymentsOverviewCard } from "./PaymentsOverviewCard";
import { TodayBookingsCard } from "./TodayBookingsCard";
import { QuickActions } from "./QuickActions";

interface Props {
  /** Resolved role taking impersonation into account */
  role: string | null;
  /** Setter to switch the parent dashboard's active section */
  setActiveSection?: (section: string) => void;
}

export const AdminHome = ({ role, setActiveSection }: Props) => {
  const navigate = useNavigate();
  const { teamId } = useEffectiveTeamId();
  const isSuperAdmin = role === "super_admin";

  const { data: metrics, isLoading: metricsLoading } = useHomeMetrics(teamId, role);
  const { data: practitioners, isLoading: pracLoading } = usePractitionerEngagement(teamId, role);
  const { data: activity, isLoading: activityLoading } = useRecentActivity(teamId, role);
  const { data: todayBookings, isLoading: bookingsLoading } = useTodayBookings(teamId);

  const goSection = (s: string) => setActiveSection?.(s);

  return (
    <div className="space-y-6">
      <QuickActions
        actions={[
          { id: "add-athlete", label: "Add athlete", icon: UserPlus, onClick: () => navigate("/settings") },
          { id: "invite-prac", label: "Invite practitioner", icon: Users, onClick: () => navigate("/settings") },
          { id: "create-booking", label: "Create booking", icon: Calendar, onClick: () => goSection("bookings") },
          { id: "view-analytics", label: "View analytics", icon: BarChart3, onClick: () => goSection("dashboard") },
          { id: "upload-data", label: "Upload data", icon: Upload, onClick: () => navigate("/settings") },
          { id: "generate-report", label: "Generate report", icon: FileText, onClick: () => goSection("reports") },
        ]}
      />

      <HomeKPICards
        metrics={metrics}
        isLoading={metricsLoading}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TodayBookingsCard
            bookings={todayBookings}
            isLoading={bookingsLoading}
            onCreateBooking={() => goSection("bookings")}
          />
          <PractitionerEngagementCard data={practitioners} isLoading={pracLoading} />
          <RecentActivityCard data={activity} isLoading={activityLoading} />
        </div>
        <div className="space-y-4">
          <PaymentsOverviewCard metrics={metrics} isLoading={metricsLoading} />
          <SocialFeedCard />
        </div>
      </div>
    </div>
  );
};
