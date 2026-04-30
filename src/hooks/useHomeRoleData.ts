import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Today's bookings — used by Practitioner & Admin home               */
/* ------------------------------------------------------------------ */
export interface TodayBooking {
  id: string;
  appointment_date: string;
  notes: string | null;
  status: string | null;
  client_id: string | null;
  therapist_id: string | null;
}

export const useTodayBookings = (
  teamId?: string | null,
  practitionerUserId?: string | null
) => {
  return useQuery({
    queryKey: ["home-today-bookings", teamId, practitionerUserId],
    queryFn: async (): Promise<TodayBooking[]> => {
      if (!teamId) return [];
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      let q = supabase
        .from("bookings")
        .select("id, appointment_date, notes, status, client_id, therapist_id")
        .eq("team_id", teamId)
        .gte("appointment_date", start.toISOString())
        .lte("appointment_date", end.toISOString())
        .order("appointment_date", { ascending: true })
        .limit(20);

      if (practitionerUserId) {
        q = q.eq("therapist_id", practitionerUserId);
      }

      const { data } = await q;
      return (data ?? []) as TodayBooking[];
    },
    enabled: !!teamId,
    staleTime: 60_000,
  });
};

/* ------------------------------------------------------------------ */
/* Athletes "needing attention" — no test in last 14 days             */
/* ------------------------------------------------------------------ */
export interface AthleteNeedingAttention {
  id: string;
  name: string;
  avatar_url: string | null;
  last_test_date: string | null;
  consent_status: string | null;
}

export const useAthletesNeedingAttention = (teamId?: string | null) => {
  return useQuery({
    queryKey: ["home-athletes-attention", teamId],
    queryFn: async (): Promise<AthleteNeedingAttention[]> => {
      if (!teamId) return [];
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const { data: athletes } = await supabase
        .from("athletes")
        .select("id, name, avatar_url, consent_status")
        .eq("team_id", teamId)
        .limit(100);

      if (!athletes || athletes.length === 0) return [];

      const names = athletes.map((a: any) => a.name);
      const { data: tests } = await supabase
        .from("test_data")
        .select("athlete_name, test_date")
        .in("athlete_name", names)
        .order("test_date", { ascending: false });

      const lastByAthlete = new Map<string, string>();
      (tests ?? []).forEach((t: any) => {
        if (!lastByAthlete.has(t.athlete_name)) {
          lastByAthlete.set(t.athlete_name, t.test_date);
        }
      });

      return athletes
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          avatar_url: a.avatar_url ?? null,
          consent_status: a.consent_status ?? null,
          last_test_date: lastByAthlete.get(a.name) ?? null,
        }))
        .filter((a) => {
          if (a.consent_status === "pending") return true;
          if (!a.last_test_date) return true;
          return new Date(a.last_test_date) < fourteenDaysAgo;
        })
        .slice(0, 8);
    },
    enabled: !!teamId,
    staleTime: 60_000,
  });
};

/* ------------------------------------------------------------------ */
/* Athlete progress — for the athlete/client home                     */
/* ------------------------------------------------------------------ */
export interface AthleteProgressSnapshot {
  athleteName: string | null;
  testsThisMonth: number;
  testsLastMonth: number;
  lastTestDate: string | null;
  recentTests: { test_date: string; test_name: string; metrics: any }[];
}

export const useAthleteProgress = (userId?: string | null) => {
  return useQuery({
    queryKey: ["home-athlete-progress", userId],
    queryFn: async (): Promise<AthleteProgressSnapshot> => {
      const empty: AthleteProgressSnapshot = {
        athleteName: null,
        testsThisMonth: 0,
        testsLastMonth: 0,
        lastTestDate: null,
        recentTests: [],
      };
      if (!userId) return empty;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", userId)
        .maybeSingle();
      const candidateName = (profile as any)?.full_name || (profile as any)?.email || null;
      if (!candidateName) return empty;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [thisMonth, lastMonth, recent] = await Promise.all([
        supabase
          .from("test_data")
          .select("id", { count: "exact", head: true })
          .eq("athlete_name", candidateName)
          .gte("test_date", startOfMonth.slice(0, 10)),
        supabase
          .from("test_data")
          .select("id", { count: "exact", head: true })
          .eq("athlete_name", candidateName)
          .gte("test_date", startOfLastMonth.slice(0, 10))
          .lte("test_date", endOfLastMonth.slice(0, 10)),
        supabase
          .from("test_data")
          .select("test_date, test_name, metrics")
          .eq("athlete_name", candidateName)
          .order("test_date", { ascending: false })
          .limit(5),
      ]);

      const recentTests = (recent.data ?? []) as any[];
      return {
        athleteName: candidateName,
        testsThisMonth: thisMonth.count ?? 0,
        testsLastMonth: lastMonth.count ?? 0,
        lastTestDate: recentTests[0]?.test_date ?? null,
        recentTests,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
};
