import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId, useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';

/**
 * Resolves the athlete record for the currently logged-in client.
 *
 * Lookup order (PGM7.1):
 *   1. Primary: athletes.user_id = auth.uid()  (canonical link)
 *   2. Fallback: athletes.email ~ profile.email within the effective team
 *      - if exactly one match and not in View-As mode, self-heal via
 *        the `claim_athlete_for_current_user` RPC (SECURITY DEFINER, scoped
 *        to the calling user — never crosses teams).
 *
 * RLS on `athletes` enforces team boundary as a second line of defence,
 * and the new "client can view own athlete row" policy restricts access
 * by user_id for the client themselves.
 */
export const useClientAthlete = () => {
  const { user, profile } = useAuth();
  const { teamId } = useEffectiveTeamId();
  const isViewAs = useIsViewAsMode();
  const qc = useQueryClient();
  const email = profile?.email ?? null;
  const uid = user?.id ?? null;

  return useQuery({
    queryKey: ['client-athlete', uid, teamId, email],
    enabled: !!uid,
    queryFn: async () => {
      // 1) Canonical lookup by user_id — but skip archived rows so a stale
      //    archived duplicate can never shadow a live linked record.
      const primary = await supabase
        .from('athletes')
        .select('id, name, email, team_id, avatar_url, user_id, sports, sport_primary, activity_status, last_test_at, updated_at')
        .eq('user_id', uid!)
        .neq('activity_status', 'archived')
        .order('last_test_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (primary.error) throw primary.error;
      if (primary.data) return primary.data;

      // 2) Fallback: email match (legacy / first-login self-heal)
      if (!email) return null;

      let fallbackQuery = supabase
        .from('athletes')
        .select('id, name, email, team_id, avatar_url, user_id, sports, sport_primary, activity_status, last_test_at, updated_at')
        .ilike('email', email)
        .neq('activity_status', 'archived')
        .limit(5);
      if (teamId) fallbackQuery = fallbackQuery.eq('team_id', teamId);

      const fallback = await fallbackQuery;
      if (fallback.error) throw fallback.error;
      const rows = fallback.data ?? [];
      if (rows.length === 0) return null;

      // Prefer an already-linked row (never override existing link).
      const linked = rows.find((r: any) => r.user_id === uid);
      if (linked) return linked;

      // Otherwise pick the best unlinked candidate via canonical scoring.
      const { pickCanonical } = await import('@/lib/athletes/duplicateDetection');
      const unlinked = rows.filter((r: any) => r.user_id == null);
      if (unlinked.length === 0) return rows[0]; // all linked to someone else — don't touch
      const candidate = pickCanonical(unlinked as any[]);

      // Self-heal only when: not impersonating + exactly one viable candidate.
      if (unlinked.length === 1 && !isViewAs) {
        try {
          const { data: claimedId, error: rpcErr } = await supabase.rpc(
            'claim_athlete_for_current_user'
          );
          if (!rpcErr && claimedId) {
            qc.invalidateQueries({ queryKey: ['client-athlete'] });
            return { ...candidate, user_id: uid };
          }
        } catch {
          /* non-fatal */
        }
      }
      return candidate;
    },
  });
};
