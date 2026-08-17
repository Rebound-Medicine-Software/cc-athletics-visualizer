import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
* Client-side metric & ranking hook.
*
* Pulls only data the client is allowed to see (test_data is public-read,
* scoped by athlete_name / team_name / test_region for ranking). Other
* athletes are NEVER returned by name to the UI — only counts/ranks.
*/

export type ScopeKey = 'club' | 'region' | 'global';

export interface MetricSpec {
  key: string; // jsonb key in metrics
label: string;
  unit: string;
  testName: string; // test_data.test_name match
higherIsBetter: boolean;
  short: string; // short id for grouping
}

export const CLIENT_METRICS: MetricSpec[] = [
  { key: 'jump_height_ft', label: 'CMJ Jump Height', unit: 'cm', testName: 'Countermovement Jump', higherIsBetter: true, short: 'cmj_h' },
  { key: 'rsi', label: 'CMJ RSI', unit: '', testName: 'Countermovement Jump', higherIsBetter: true, short: 'cmj_rsi' },
  { key: 'force_peak', label: 'IMTP Peak Force', unit: 'N', testName: 'Isometric Mid-Thigh Pull (IMTP)', higherIsBetter: true, short: 'imtp_pf' },
  { key: 'rsi', label: 'Pogo RSI', unit: '', testName: 'Pogo Jump', higherIsBetter: true, short: 'pogo_rsi' },
  ];

export interface MetricSnapshot {
  spec: MetricSpec;
  baseline: { value: number; date: string } | null;
  latest: { value: number; date: string } | null;
  changePct: number | null;
  direction: 'up' | 'down' | 'flat' | null;
  isImprovement: boolean | null;
}

export interface RankingSnapshot {
  spec: MetricSpec;
  scope: ScopeKey;
  scopeLabel: string;
  yourValue: number | null;
  rank: number | null; // 1-based; null if no value
totalAthletes: number; // distinct athletes with a value
topValue: number | null;
  beatenBy: number; // athletes ahead of you
beatenByLabel: string; // anonymised, e.g. "2 athletes in your club"
}

const avgRepValue = (rows: any[], key: string): number | null => {
  const vals: number[] = [];
  rows.forEach((r) => {
    const m = r.metrics ?? {};
    const raw = m[key];
    const n = typeof raw === 'number' ? raw : parseFloat(raw);
    if (Number.isFinite(n)) vals.push(n);
  });
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const groupByDate = (rows: any[]): Map<string, any[]> => {
  const m = new Map<string, any[]>();
  rows.forEach((r) => {
    const d = r.test_date;
    if (!d) return;
    if (!m.has(d)) m.set(d, []);
    m.get(d)!.push(r);
  });
  return m;
};

    const computeMetric = (rows: any[], spec: MetricSpec): MetricSnapshot => {
      const byDate = groupByDate(rows);
      const dates = Array.from(byDate.keys()).sort();
      let baseline: MetricSnapshot['baseline'] = null;
      let latest: MetricSnapshot['latest'] = null;
      for (const d of dates) {
        const v = avgRepValue(byDate.get(d)!, spec.key);
        if (v == null) continue;
        if (!baseline) baseline = { value: v, date: d };
        latest = { value: v, date: d };
      }
      let changePct: number | null = null;
      let direction: MetricSnapshot['direction'] = null;
      let isImprovement: MetricSnapshot['isImprovement'] = null;
      if (baseline && latest && baseline.date !== latest.date && baseline.value !== 0) {
               changePct = ((latest.value - baseline.value) / Math.abs(baseline.value)) * 100;
        direction = changePct > 0.5 ? 'up' : changePct < -0.5 ? 'down' : 'flat';
        isImprovement =
          direction === 'flat'
        ? null
          : (direction === 'up') === spec.higherIsBetter;
      }
      return { spec, baseline, latest, changePct, direction, isImprovement };
    };

interface Args {
  athleteId: string | null;
  athleteName: string | null;
  teamName: string | null;
}

/**
* Resolves the athlete's own team_name, used to scope test_data lookups of
* the athlete's OWN data (never other athletes) to their team. Guards
* against a same-named athlete on a different team silently feeding wrong
* rows into this athlete's own baseline/latest metrics or region lookup —
* same bug class fixed in PR #34 (useHomeRoleData) and PR #37
* (compute-client-rank-events). Prefers a caller-supplied teamName if one
* was passed in; otherwise resolves it via the athlete's team_id. Falls
* back to no scoping at all if neither resolves, matching the fallback
* pattern used elsewhere in this codebase — this can only make results
* more accurate, never worse.
*
* Deliberately NOT applied to the peer-comparison ranking scopes below
* (club/region/global bestByAthlete matching) — that's a separate, bigger
* architectural question flagged in framework.md Section 9, needs Josh's
* call on approach before a run attempts it.
*/
const resolveTeamName = async (
  athleteId: string | null,
  fallbackTeamName: string | null,
  ): Promise<string | null> => {
  if (fallbackTeamName) return fallbackTeamName;
  if (!athleteId) return null;
  const { data: athleteRow } = await supabase
  .from('athletes')
  .select('team_id')
  .eq('id', athleteId)
  .maybeSingle();
  const teamId = (athleteRow as any)?.team_id ?? null;
  if (!teamId) return null;
  const { data: teamRow } = await supabase
  .from('teams')
  .select('name')
  .eq('id', teamId)
  .maybeSingle();
  return (teamRow as any)?.name ?? null;
};

export const useClientMetrics = ({ athleteId, athleteName, teamName }: Args) => {
  return useQuery({
    queryKey: ['client-metrics', athleteId],
    enabled: !!athleteName,
    staleTime: 60_000,
    queryFn: async () => {
      const testNames = Array.from(new Set(CLIENT_METRICS.map((m) => m.testName)));
      const resolvedTeamName = await resolveTeamName(athleteId, teamName);
      let query = supabase
      .from('test_data')
      .select('test_date, test_name, metrics')
      .eq('athlete_name', athleteName!)
      .in('test_name', testNames)
      .order('test_date', { ascending: true })
      .limit(500);
      if (resolvedTeamName) query = query.eq('team_name', resolvedTeamName);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      return CLIENT_METRICS.map((spec) =>
        computeMetric(rows.filter((r: any) => r.test_name === spec.testName), spec)
                                );
    },
  });
};

/**
* Ranking snapshot for a single metric in a single scope.
* Returns ONLY anonymised aggregates — never other athletes' names.
*/
export const useClientRankings = ({ athleteId, athleteName, teamName }: Args) => {
  return useQuery({
    queryKey: ['client-rankings', athleteName, teamName],
    enabled: !!athleteName,
    staleTime: 60_000,
    queryFn: async (): Promise<RankingSnapshot[]> => {
      const out: RankingSnapshot[] = [];
      const resolvedTeamName = await resolveTeamName(athleteId, teamName);
      // Resolve athlete's region from their most recent test row, if any —
    // scoped to the athlete's own team where possible, so a same-named
    // athlete on a different team can't feed a wrong region into "your
    // region" ranking.
    let meQuery = supabase
      .from('test_data')
      .select('test_region')
      .eq('athlete_name', athleteName!)
      .not('test_region', 'is', null)
      .order('test_date', { ascending: false })
      .limit(1);
      if (resolvedTeamName) meQuery = meQuery.eq('team_name', resolvedTeamName);
      const { data: meRows } = await meQuery;
      const myRegion = (meRows?.[0] as any)?.test_region ?? null;

    for (const spec of CLIENT_METRICS) {
      // Pull a bounded sample of test rows for this test
      const baseSelect = supabase
      .from('test_data')
      .select('athlete_name, team_name, test_region, test_date, metrics')
      .eq('test_name', spec.testName)
      .order('test_date', { ascending: false })
      .limit(2000);
      const { data, error } = await baseSelect;
      if (error || !data) continue;

      const scopes: { key: ScopeKey; label: string; filter: (r: any) => boolean }[] = [
        { key: 'club', label: teamName ? `your club (${teamName})` : 'your club', filter: (r) => !!teamName && r.team_name === teamName },
        { key: 'region', label: myRegion ? `your region (${myRegion})` : 'your region', filter: (r) => !!myRegion && r.test_region === myRegion },
        { key: 'global', label: 'globally', filter: () => true },
        ];

      for (const scope of scopes) {
        // Best (per-athlete) value within scope
      const bestByAthlete = new Map<string, number>();
        data.forEach((r: any) => {
          if (!scope.filter(r)) return;
          const m = r.metrics ?? {};
          const raw = m[spec.key];
          const v = typeof raw === 'number' ? raw : parseFloat(raw);
        if (!Number.isFinite(v)) return;
          const prev = bestByAthlete.get(r.athlete_name);
          if (prev == null || (spec.higherIsBetter ? v > prev : v < prev)) {
            bestByAthlete.set(r.athlete_name, v);
          }
        });
        const totalAthletes = bestByAthlete.size;
        if (totalAthletes === 0) continue;
        const yourValue = bestByAthlete.get(athleteName!) ?? null;
        const sorted = Array.from(bestByAthlete.entries())
        .sort((a, b) => (spec.higherIsBetter ? b[1] - a[1] : a[1] - b[1]));
        const topValue = sorted[0]?.[1] ?? null;
        let rank: number | null = null;
        let beatenBy = 0;
        if (yourValue != null) {
          rank = sorted.findIndex(([n]) => n === athleteName) + 1 || null;
          beatenBy = rank ? rank - 1 : 0;
        }
        out.push({
          spec,
          scope: scope.key,
          scopeLabel: scope.label,
          yourValue,
          rank,
          totalAthletes,
          topValue,
          beatenBy,
          beatenByLabel:
            beatenBy === 0
          ? `You lead ${scope.label}`
            : `${beatenBy} ahead of you in ${scope.label}`,
        });
      }
    }
      return out;
    },
  });
};
