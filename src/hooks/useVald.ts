/**
 * useVald — React Query hooks for VALD API via Supabase Edge Function
 *
 * Usage:
 *   const { data: athletes } = useValdAthletes()
 *   const { data: tests }    = useValdTests(athleteId)
 *   const { data: detail }   = useValdTestDetail(testId)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────────────

export interface ValdAthlete {
  id: string;
  number: string;
  name: string;
  givenName: string;
  familyName: string;
  dob: string;
  sex: string;
  teams: string;
}

export interface ValdTest {
  id: string;
  date: string;
  type: string;
  cmjH: number | null;
  cmjHL: number | null;
  cmjHR: number | null;
  cmjRSI: number | null;
  cmjPP: number | null;
  cmjAsym: number | null;
  djH: number | null;
  djRSI: number | null;
  djCT: number | null;
  pjH: number | null;
  pjRSI: number | null;
}

export interface ValdTestDetail extends ValdTest {
  trialCount: number;
  raw: Record<string, number>;
  djL: number | null;
  djR: number | null;
  djAsym: number | null;
  pjCT: number | null;
  solL: number | null;
  solR: number | null;
  gasL: number | null;
  gasR: number | null;
}

// ── API caller via Supabase Edge Function ──────────────────────────────────────────

async function callBridge<T>(params: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams(params).toString();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/vald-bridge?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`vald-bridge ${res.status}: ${err}`);
  }

  const data = await res.json();
  if (data?.error) throw new Error(data.error as string);
  return data as T;
}

// ── Hooks ───────────────────────────────────────────────────────────────────────────

/** All athletes in your VALD tenant. Cached 5 minutes. */
export function useValdAthletes() {
  return useQuery({
    queryKey: ["vald", "athletes"],
    queryFn: () =>
      callBridge<{ athletes: ValdAthlete[]; count: number }>({
        action: "athletes",
      }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.athletes,
  });
}

/** Test sessions for one athlete. Only runs when athleteId is provided. */
export function useValdTests(athleteId: string | null) {
  return useQuery({
    queryKey: ["vald", "tests", athleteId],
    queryFn: () =>
      callBridge<{ tests: ValdTest[]; count: number }>({
        action: "tests",
        athleteId: athleteId!,
      }),
    enabled: !!athleteId,
    staleTime: 2 * 60 * 1000,
    select: (d) => d.tests,
  });
}

/** Full metric detail for one test session. Cached 10 minutes. */
export function useValdTestDetail(testId: string | null) {
  return useQuery({
    queryKey: ["vald", "detail", testId],
    queryFn: () =>
      callBridge<ValdTestDetail>({ action: "detail", testId: testId! }),
    enabled: !!testId,
    staleTime: 10 * 60 * 1000,
  });
}
