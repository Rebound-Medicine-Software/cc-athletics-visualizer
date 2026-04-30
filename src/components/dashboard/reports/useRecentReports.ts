import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReportStatus = "success" | "failed";
export type ReportKind = "force-plate" | "athlete-summary";

export interface RecentReport {
  id: string;
  kind: ReportKind;
  athlete_name: string;
  team_name?: string;
  status: ReportStatus;
  url?: string;
  filename?: string;
  test_count?: number;
  error?: string;
  created_at: string;
}

const ROW_LIMIT = 25;

const eventToKind = (eventType: string): ReportKind => {
  if (eventType.startsWith("ai_coach")) return "athlete-summary";
  if (eventType.startsWith("report_email")) return "force-plate";
  return "force-plate";
};

/**
 * Server-backed recent report activity for a team.
 * Reads from the `list_team_report_activity` RPC, which is RLS-aware:
 *   - Super admins can read any team
 *   - Org members can only read their own team
 *
 * Replaces the previous localStorage-only history.
 */
export const useRecentReports = (teamScopeKey: string | null | undefined) => {
  const qc = useQueryClient();
  const teamId = teamScopeKey && teamScopeKey !== "default" ? teamScopeKey : null;

  const query = useQuery({
    queryKey: ["team-report-activity", teamId],
    enabled: !!teamId,
    staleTime: 30_000,
    queryFn: async (): Promise<RecentReport[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase.rpc("list_team_report_activity", {
        team_uuid: teamId,
        row_limit: ROW_LIMIT,
      });
      if (error) throw error;
      return ((data as any[]) ?? []).map((r) => {
        const reportType = (r.report_type as string) ?? eventToKind(r.event_type);
        const kind: ReportKind =
          reportType === "athlete-summary" ? "athlete-summary" : "force-plate";
        return {
          id: r.id,
          kind,
          athlete_name: r.organisation_name ?? "Athlete",
          team_name: r.organisation_name ?? undefined,
          status: r.status as ReportStatus,
          url: r.report_url ?? undefined,
          filename: r.filename ?? undefined,
          test_count: r.test_count ?? undefined,
          error: r.error_reason ?? undefined,
          created_at: r.created_at,
        };
      });
    },
  });

  // Optimistically refresh after a generation triggered from the UI; the edge
  // function writes the canonical row, this just nudges the query.
  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["team-report-activity", teamId] });
  }, [qc, teamId]);

  // Kept for API compatibility — server is the source of truth, so `add` is
  // a no-op besides triggering a refetch a moment later.
  const add = useCallback(
    (_report: Omit<RecentReport, "id" | "created_at">) => {
      setTimeout(() => refresh(), 600);
      return null;
    },
    [refresh],
  );

  // No client-side clear: history is server-side and team-scoped.
  const clear = useCallback(() => {
    refresh();
  }, [refresh]);

  return {
    items: query.data ?? [],
    add,
    clear,
    refresh,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
};
