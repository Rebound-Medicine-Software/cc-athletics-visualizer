import { useAuth } from "@/contexts/AuthContext";
import { Calendar, BarChart3, FileText, Bell } from "lucide-react";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { useTodayBookings, useAthleteProgress } from "@/hooks/useHomeRoleData";
import { TodayBookingsCard } from "./TodayBookingsCard";
import { AthleteProgressCard } from "./AthleteProgressCard";
import { ComingSoonSection } from "@/components/dashboard/ComingSoonSection";
import { QuickActions } from "./QuickActions";

interface Props {
  setActiveSection?: (section: string) => void;
}

/**
 * Athlete / client home — focuses on personal progress + next sessions.
 */
export const AthleteHome = ({ setActiveSection }: Props) => {
  const { user } = useAuth();
  const { teamId } = useEffectiveTeamId();

  const { data: progress, isLoading: progressLoading } = useAthleteProgress(user?.id);
  const { data: todayBookings, isLoading: bookingsLoading } = useTodayBookings(teamId);

  const goSection = (s: string) => setActiveSection?.(s);

  return (
    <div className="space-y-6">
      <QuickActions
        title="What would you like to do?"
        actions={[
          { id: "view-progress", label: "View my progress", icon: BarChart3, onClick: () => goSection("dashboard") },
          { id: "view-bookings", label: "Upcoming sessions", icon: Calendar, onClick: () => goSection("bookings") },
          { id: "view-reports", label: "My reports", icon: FileText, onClick: () => goSection("reports") },
          { id: "view-notifications", label: "Notifications", icon: Bell, onClick: () => goSection("home") },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AthleteProgressCard data={progress} isLoading={progressLoading} />
          <ComingSoonSection
            title="Assigned programmes"
            description="Programmes from your practitioner will appear here once assigned."
            eta="Q4 2026"
            bullets={[
              "Daily exercise checklists",
              "Video demonstrations",
              "Track your adherence",
              "Progress notes from your practitioner",
            ]}
          />
        </div>
        <div className="space-y-4">
          <TodayBookingsCard
            bookings={todayBookings}
            isLoading={bookingsLoading}
            onCreateBooking={() => goSection("bookings")}
            title="Upcoming sessions"
          />
        </div>
      </div>
    </div>
  );
};
