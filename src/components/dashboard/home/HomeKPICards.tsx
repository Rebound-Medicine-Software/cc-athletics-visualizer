import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, UserCheck, CreditCard, Activity, Calendar, FileCheck, TrendingUp } from "lucide-react";
import type { HomeMetrics } from "@/hooks/useHomeMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamCurrency } from "@/hooks/useTeamCurrency";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";

interface Props {
  metrics?: HomeMetrics;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isPractitioner?: boolean;
}

export const HomeKPICards = ({ metrics, isLoading, isSuperAdmin, isPractitioner }: Props) => {
  const { profile } = useAuth();
  const { symbol } = useTeamCurrency(useEffectiveTeamId().teamId);
  const allCards = [
    ...(isSuperAdmin
      ? [{ id: "orgs", icon: Building2, label: "Active Organisations", value: metrics?.activeOrgLogins30d, sub: `${metrics?.totalOrganisations ?? 0} total`, color: "text-blue-600" }]
      : []),
    { id: "practitioners", icon: Users, label: "Practitioners", value: metrics?.practitionerCount, sub: `${metrics?.practitionerLogins7d ?? 0} active this week`, color: "text-indigo-600" },
    { id: "patients", icon: UserCheck, label: "Patients / Clients", value: metrics?.patientCount, sub: `${metrics?.patientLogins7d ?? 0} active this week`, color: "text-emerald-600" },
    { id: "paying", icon: CreditCard, label: "Paying Customers", value: metrics?.payingCustomers, sub: `${symbol}${(metrics?.totalRevenue ?? 0).toFixed(0)}/mo`, color: "text-amber-600" },
    { id: "tests", icon: Activity, label: "Tests This Week", value: metrics?.testsThisWeek, sub: `${metrics?.totalAthletes ?? 0} athletes total`, color: "text-purple-600" },
    { id: "bookings", icon: Calendar, label: "Upcoming Bookings", value: metrics?.upcomingBookings, sub: "Next 30 days", color: "text-rose-600" },
    { id: "consents", icon: FileCheck, label: "Consents Signed", value: metrics?.consentSigned, sub: `${metrics?.consentPending ?? 0} pending`, color: "text-teal-600" },
    { id: "logins", icon: TrendingUp, label: "Org Logins (7d)", value: metrics?.activeOrgLogins7d, sub: "Total session count", color: "text-cyan-600" },
  ];

  const practitionerAllowed = new Set(["patients", "tests", "bookings", "consents"]);
  const cards = isPractitioner ? allCards.filter(c => practitionerAllowed.has(c.id)) : allCards;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card key={i} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">{c.label}</div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{c.value ?? 0}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
