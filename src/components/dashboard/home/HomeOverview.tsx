import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { AdminHome } from "./AdminHome";
import { PractitionerHome } from "./PractitionerHome";
import { AthleteHome } from "./AthleteHome";

interface HomeOverviewProps {
  /** Bubbles a section change up to the parent dashboard */
  setActiveSection?: (section: string) => void;
}

export const HomeOverview = ({ setActiveSection }: HomeOverviewProps) => {
  const { profile } = useAuth();
  const { isImpersonating } = useEffectiveTeamId();

  // While impersonating, render as if the impersonated org is logged in.
  const role = isImpersonating ? "organisation" : (profile?.role ?? null);

  const isPractitioner =
    role === "clinician" || (role as string) === "practitioner";
  const isAthlete = (role as string) === "client" || (role as string) === "athlete";

  // Welcome banner is shared
  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "";
  const subtitle =
    role === "super_admin"
      ? "Platform-wide overview across all organisations."
      : isPractitioner
      ? "Here's what's on your plate today."
      : isAthlete
      ? "Track your progress and upcoming sessions."
      : "Overview of your team's activity, engagement, and growth.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {isPractitioner ? (
        <PractitionerHome role={role} setActiveSection={setActiveSection} />
      ) : isAthlete ? (
        <AthleteHome setActiveSection={setActiveSection} />
      ) : (
        <AdminHome role={role} setActiveSection={setActiveSection} />
      )}
    </div>
  );
};
