import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomeMetrics {
  activeOrgLogins7d: number;
  activeOrgLogins30d: number;
  totalOrganisations: number;
  practitionerCount: number;
  practitionerLogins7d: number;
  patientCount: number;
  patientLogins7d: number;
  payingCustomers: number;
  totalRevenue: number;
  testsThisWeek: number;
  totalAthletes: number;
  consentSigned: number;
  consentPending: number;
  upcomingBookings: number;
}

export interface PractitionerEngagement {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  last_login: string | null;
  login_count_30d: number;
}

export interface RecentActivity {
  id: string;
  type: "login" | "booking" | "test" | "consent";
  user: string;
  description: string;
  timestamp: string;
}

export const useHomeMetrics = (teamId?: string | null, role?: string | null) => {
  return useQuery({
    queryKey: ["home-metrics", teamId, role],
    queryFn: async (): Promise<HomeMetrics> => {
      const isSuperAdmin = role === "super_admin";
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      const loginsBase = supabase.from("login_events").select("id, role, user_id", { count: "exact", head: false });
      const profilesBase = supabase.from("profiles").select("id, role, subscription_status, team_id, tier_id", { count: "exact" });
      const bookingsBase = supabase.from("bookings").select("id", { count: "exact", head: true });
      const athletesBase = supabase.from("athletes").select("id, consent_status", { count: "exact" });
      const testsBase = supabase.from("test_data").select("id", { count: "exact", head: true });

      const scopeProfiles = (q: any) => (isSuperAdmin || !teamId ? q : q.eq("team_id", teamId));
      const scopeLogins = (q: any) => (isSuperAdmin || !teamId ? q : q.eq("team_id", teamId));
      const scopeBookings = (q: any) => (isSuperAdmin || !teamId ? q : q.eq("team_id", teamId));
      const scopeAthletes = (q: any) => (isSuperAdmin || !teamId ? q : q.eq("team_id", teamId));

      const [
        orgLogins7,
        orgLogins30,
        practLogins7,
        allProfiles,
        upcomingBookingsRes,
        athletesRes,
        testsThisWeekRes,
      ] = await Promise.all([
        scopeLogins(loginsBase).eq("role", "organisation").gte("created_at", sevenDaysAgo),
        scopeLogins(supabase.from("login_events").select("user_id")).eq("role", "organisation").gte("created_at", thirtyDaysAgo),
        scopeLogins(supabase.from("login_events").select("user_id")).eq("role", "practitioner").gte("created_at", sevenDaysAgo),
        scopeProfiles(profilesBase),
        scopeBookings(bookingsBase).gte("appointment_date", now),
        scopeAthletes(athletesBase),
        scopeBookings(testsBase).gte("test_date", sevenDaysAgo.slice(0, 10)),
      ]);

      const profiles = (allProfiles.data ?? []) as any[];
      const orgs = profiles.filter((p) => p.role === "organisation");
      const pracs = profiles.filter((p) => p.role === "practitioner");
      const patients = profiles.filter((p) => p.role === "client");
      const paying = profiles.filter((p) => p.subscription_status === "active");

      // Patient logins 7d
      const { data: patientLoginsData } = await scopeLogins(supabase.from("login_events").select("user_id"))
        .eq("role", "client")
        .gte("created_at", sevenDaysAgo);

      // Tier prices for revenue estimate
      let revenue = 0;
      if (paying.length > 0) {
        const tierIds = [...new Set(paying.map((p) => p.tier_id).filter(Boolean))];
        if (tierIds.length > 0) {
          const { data: tiers } = await supabase.from("tiers").select("id, price_monthly").in("id", tierIds as string[]);
          const tierMap = new Map((tiers ?? []).map((t: any) => [t.id, Number(t.price_monthly) || 0]));
          revenue = paying.reduce((sum, p) => sum + (tierMap.get(p.tier_id) ?? 0), 0);
        }
      }

      const athletes = (athletesRes.data ?? []) as any[];
      const consentSigned = athletes.filter((a) => a.consent_status === "signed").length;
      const consentPending = athletes.filter((a) => a.consent_status === "pending").length;

      const uniqOrgLogins30 = new Set((orgLogins30.data ?? []).map((r: any) => r.user_id)).size;
      const uniqPractLogins7 = new Set((practLogins7.data ?? []).map((r: any) => r.user_id)).size;
      const uniqPatientLogins7 = new Set((patientLoginsData ?? []).map((r: any) => r.user_id)).size;

      return {
        activeOrgLogins7d: orgLogins7.count ?? 0,
        activeOrgLogins30d: uniqOrgLogins30,
        totalOrganisations: orgs.length,
        practitionerCount: pracs.length,
        practitionerLogins7d: uniqPractLogins7,
        patientCount: patients.length,
        patientLogins7d: uniqPatientLogins7,
        payingCustomers: paying.length,
        totalRevenue: revenue,
        testsThisWeek: testsThisWeekRes.count ?? 0,
        totalAthletes: athletesRes.count ?? 0,
        consentSigned,
        consentPending,
        upcomingBookings: upcomingBookingsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
};

export const usePractitionerEngagement = (teamId?: string | null, role?: string | null) => {
  return useQuery({
    queryKey: ["practitioner-engagement", teamId, role],
    queryFn: async (): Promise<PractitionerEngagement[]> => {
      const isSuperAdmin = role === "super_admin";
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      let q = supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, team_id")
        .eq("role", "practitioner");
      if (!isSuperAdmin && teamId) q = q.eq("team_id", teamId);

      const { data: pracs } = await q.limit(20);
      if (!pracs || pracs.length === 0) return [];

      const userIds = pracs.map((p: any) => p.user_id);
      const { data: logins } = await supabase
        .from("login_events")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      const lastLoginMap = new Map<string, string>();
      const countMap = new Map<string, number>();
      (logins ?? []).forEach((l: any) => {
        if (!lastLoginMap.has(l.user_id)) lastLoginMap.set(l.user_id, l.created_at);
        countMap.set(l.user_id, (countMap.get(l.user_id) ?? 0) + 1);
      });

      return pracs.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        last_login: lastLoginMap.get(p.user_id) ?? null,
        login_count_30d: countMap.get(p.user_id) ?? 0,
      }));
    },
    staleTime: 60_000,
  });
};

export const useRecentActivity = (teamId?: string | null, role?: string | null) => {
  return useQuery({
    queryKey: ["recent-activity", teamId, role],
    queryFn: async (): Promise<RecentActivity[]> => {
      const isSuperAdmin = role === "super_admin";

      let loginsQ = supabase
        .from("login_events")
        .select("id, user_id, role, created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      if (!isSuperAdmin && teamId) loginsQ = loginsQ.eq("team_id", teamId);

      const { data: logins } = await loginsQ;

      const userIds = [...new Set((logins ?? []).map((l: any) => l.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name || p.email]));

      return (logins ?? []).map((l: any) => ({
        id: l.id,
        type: "login" as const,
        user: nameMap.get(l.user_id) || "Unknown",
        description: `Logged in as ${l.role || "user"}`,
        timestamp: l.created_at,
      }));
    },
    staleTime: 30_000,
  });
};
