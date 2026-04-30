import { useCallback, useEffect, useState } from "react";

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
  created_at: string; // ISO
}

const KEY_PREFIX = "nx-recent-reports::";
const MAX_ITEMS = 25;

/**
 * Local, per-team history of reports generated *in this browser*.
 * Persisted in localStorage so practitioners see their recent activity
 * across reloads without weakening RLS or relying on an admin-only telemetry table.
 *
 * NB: This is intentionally local — server-side activity logs remain
 * scoped to super admins via platform_activity_logs RLS.
 */
export const useRecentReports = (teamScopeKey: string | null | undefined) => {
  const storageKey = teamScopeKey ? `${KEY_PREFIX}${teamScopeKey}` : null;
  const [items, setItems] = useState<RecentReport[]>([]);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setItems(raw ? (JSON.parse(raw) as RecentReport[]) : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: RecentReport[]) => {
      setItems(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* quota — ignore */
        }
      }
    },
    [storageKey],
  );

  const add = useCallback(
    (report: Omit<RecentReport, "id" | "created_at">) => {
      const entry: RecentReport = {
        ...report,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      const next = [entry, ...items].slice(0, MAX_ITEMS);
      persist(next);
      return entry;
    },
    [items, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { items, add, clear };
};
