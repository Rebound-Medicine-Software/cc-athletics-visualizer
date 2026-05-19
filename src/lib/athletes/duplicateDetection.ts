/**
 * Athlete duplicate detection + canonical selection helpers.
 *
 * Pure functions only — no DB access. Consumers pass in athlete rows
 * (already team-scoped + RLS-filtered) and receive grouped duplicates
 * and a canonical pick per group.
 *
 * Heuristic priority (canonical):
 *   1. has linked user_id
 *   2. has email
 *   3. activity_status === 'active' (skip archived)
 *   4. most recent activity (last_test_at)
 *   5. highest assignment_count (when provided)
 *   6. most recently updated/created
 */

export interface AthleteLike {
  id: string;
  name?: string | null;
  email?: string | null;
  user_id?: string | null;
  activity_status?: string | null;
  team_id?: string | null;
  last_test_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  /** Optional: assignment count (set by caller) */
  assignment_count?: number;
}

const normName = (n?: string | null) =>
  (n ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const normEmail = (e?: string | null) =>
  (e ?? '').trim().toLowerCase() || null;

/**
 * Build a stable signature used to group likely duplicates.
 * - email match wins (case-insensitive)
 * - else normalised name within team
 */
export const duplicateKey = (a: AthleteLike): string => {
  const email = normEmail(a.email);
  if (email) return `email:${email}`;
  const name = normName(a.name);
  return name ? `name:${a.team_id ?? '-'}:${name}` : `id:${a.id}`;
};

export interface DuplicateGroup<T extends AthleteLike> {
  key: string;
  rows: T[];
  canonical: T;
  hasDuplicates: boolean;
}

const score = (a: AthleteLike): number => {
  let s = 0;
  if (a.user_id) s += 1000;
  if (a.email) s += 200;
  if ((a.activity_status ?? 'active') !== 'archived') s += 100;
  if (a.last_test_at) s += 50;
  s += Math.min(a.assignment_count ?? 0, 50);
  // tie-breakers
  const t = a.updated_at ?? a.created_at;
  if (t) s += new Date(t).getTime() / 1e13;
  return s;
};

export const pickCanonical = <T extends AthleteLike>(rows: T[]): T => {
  return rows.reduce((best, r) => (score(r) > score(best) ? r : best), rows[0]);
};

export const groupDuplicates = <T extends AthleteLike>(
  rows: T[]
): Map<string, DuplicateGroup<T>> => {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = duplicateKey(r);
    const arr = groups.get(k) ?? [];
    arr.push(r);
    groups.set(k, arr);
  }
  const result = new Map<string, DuplicateGroup<T>>();
  for (const [key, list] of groups) {
    result.set(key, {
      key,
      rows: list,
      canonical: pickCanonical(list),
      hasDuplicates: list.length > 1,
    });
  }
  return result;
};

export interface AthleteWithDupMeta extends AthleteLike {
  duplicateKey: string;
  duplicateCount: number;
  isCanonical: boolean;
  isLinked: boolean;
  isArchived: boolean;
}

export const annotateAthletes = <T extends AthleteLike>(
  rows: T[]
): (T & AthleteWithDupMeta)[] => {
  const groups = groupDuplicates(rows);
  return rows.map((r) => {
    const g = groups.get(duplicateKey(r))!;
    return {
      ...r,
      duplicateKey: g.key,
      duplicateCount: g.rows.length,
      isCanonical: g.canonical.id === r.id,
      isLinked: !!r.user_id,
      isArchived: (r.activity_status ?? 'active') === 'archived',
    };
  });
};
