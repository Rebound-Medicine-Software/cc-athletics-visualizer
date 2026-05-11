import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, BarChart3, UserPlus, Activity } from "lucide-react";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { useHomeMetrics, useRecentActivity } from "@/hooks/useHomeMetrics";
import { useTodayBookings, useAthletesNeedingAttention } from "@/hooks/useHomeRoleData";
import { HomeKPICards } from "./HomeKPICards";
import { TodayBookingsCard } from "./TodayBookingsCard";
import { AthletesNeedingAttentionCard } from "./AthletesNeedingAttentionCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { QuickActions } from "./QuickActions";
import { PractitionerActionTray } from "./PractitionerActionTray";

interface Props {
  role: string | null;
  setActiveSection?: (section: string) => void;
}

/**
 * "My Day" view for clinicians/practitioners.
 * Prioritises today's bookings + athletes needing attention over org-wide KPIs.
 */
export const PractitionerHome = ({ role, setActiveSection }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useEffectiveTeamId();

  const { data: metrics, isLoading: metricsLoading } = useHomeMetrics(teamId, role);
  const { data: todayBookings, isLoading: bookingsLoading } = useTodayBookings(
    teamId,
    user?.id
  );
  const { data: needAttention, isLoading: attnLoading } = useAthletesNeedingAttention(teamId);
  const { data: activity, isLoading: activityLoading } = useRecentActivity(teamId, role);

  const goSection = (s: string) => setActiveSection?.(s);

  return (
    <div className="space-y-6">
      <QuickActions
        title="My day · Quick actions"
        actions={[
          { id: "view-bookings", label: "View calendar", icon: Calendar, onClick: () => goSection("bookings") },
          { id: "view-athletes", label: "Athletes", icon: UserPlus, onClick: () => navigate("/settings") },
          { id: "view-live", label: "Live data", icon: Activity, onClick: () => goSection("live-data") },
          { id: "view-analytics", label: "Analytics", icon: BarChart3, onClick: () => goSection("dashboard") },
          { id: "generate-report", label: "Generate report", icon: FileText, onClick: () => goSection("reports") },
        ]}
      />

      {/* Practitioner-relevant KPIs only */}
      <HomeKPICards
        metrics={metrics}
        isLoading={metricsLoading}
        isSuperAdmin={false}
        isPractitioner
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TodayBookingsCard
            bookings={todayBookings}
            isLoading={bookingsLoading}
            onCreateBooking={() => goSection("bookings")}
            title="My day"
          />
          <AthletesNeedingAttentionCard
            data={needAttention}
            isLoading={attnLoading}
            onAddAthlete={() => navigate("/settings")}
          />
        </div>
        <div className="space-y-4">
          <PractitionerActionTray />
          <RecentActivityCard data={activity} isLoading={activityLoading} />
        </div>
      </div>
    </div>
  );
};
