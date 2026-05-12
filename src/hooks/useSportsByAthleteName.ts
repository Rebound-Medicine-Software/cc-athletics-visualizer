import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceTeams } from '@/hooks/useWorkspaceTeams';
import { canonicalSport } from '@/lib/sports/normalize';

export interface AthleteSportRow {
  id: string;
  name: string;
  team_id: string | null;
  sports: string[];
  sport_primary: string | null;
  canonicalSports: string[];
}

/**
 * Workspace-scoped lookup of athlete sports metadata.
 *
 * Returns:
 *   - rows[]: athletes with their tagged sports (RLS still applies)
 *   - byName: case-insensitive map by athlete_name → AthleteSportRow
 *   - allCanonicalSports: sorted unique canonical sport tags in workspace
 */
export const useSportsByAthleteName = () => {
  const { data: workspaceTeams } = useWorkspaceTeams();
  const teamIds = (workspaceTeams ?? []).map((t) => t.id);

  return useQuery({
    queryKey: ['sports-by-athlete-name', teamIds.sort().join(',')],
    enabled: workspaceTeams !== undefined,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('athletes')
        .select('id, name, team_id, sports, sport_primary')
        .limit(5000);
      if (teamIds.length) q = q.in('team_id', teamIds);
      const { data, error } = await q;
      if (error) throw error;
      const rows: AthleteSportRow[] = (data ?? []).map((r: any) => {
        const sports: string[] = Array.isArray(r.sports) ? r.sports : [];
        return {
          id: r.id,
          name: r.name ?? '',
          team_id: r.team_id ?? null,
          sports,
          sport_primary: r.sport_primary ?? null,
          canonicalSports: Array.from(
            new Set(sports.map((s) => canonicalSport(s)).filter(Boolean) as string[]),
          ),
        };
      });
      const byName = new Map<string, AthleteSportRow>();
      rows.forEach((r) => {
        if (r.name) byName.set(r.name.trim().toLowerCase(), r);
      });
      const allCanonicalSports = Array.from(
        new Set(rows.flatMap((r) => r.canonicalSports)),
      ).sort();
      return { rows, byName, allCanonicalSports };
    },
  });
};
