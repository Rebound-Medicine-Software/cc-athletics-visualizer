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
      // 1) Canonical lookup by user_id
      const primary = await supabase
        .from('athletes')
        .select('id, name, email, team_id, avatar_url, user_id, sports, sport_primary')
        .eq('user_id', uid!)
        .limit(1)
        .maybeSingle();
      if (primary.error) throw primary.error;
      if (primary.data) return primary.data;

      // 2) Fallback: email match (legacy / first-login self-heal)
      if (!email) return null;

      // Prefer team-scoped match when we know the team; otherwise fall back
      // to a global email match (RLS still constrains visibility).
      let fallbackQuery = supabase
        .from('athletes')
        .select('id, name, email, team_id, avatar_url, user_id, sports, sport_primary')
        .ilike('email', email)
        .limit(2);
      if (teamId) fallbackQuery = fallbackQuery.eq('team_id', teamId);

      const fallback = await fallbackQuery;
      if (fallback.error) throw fallback.error;
      const rows = fallback.data ?? [];
      if (rows.length === 0) return null;

      // Self-heal only when:
      //  - exactly one fallback candidate,
      //  - not impersonating (super admin View-As must not write),
      //  - candidate row is currently unlinked.
      const candidate = rows[0];
      if (rows.length === 1 && !isViewAs && candidate.user_id == null) {
        try {
          const { data: claimedId, error: rpcErr } = await supabase.rpc(
            'claim_athlete_for_current_user'
          );
          if (!rpcErr && claimedId) {
            qc.invalidateQueries({ queryKey: ['client-athlete'] });
            return { ...candidate, user_id: uid };
          }
        } catch {
          /* non-fatal — return fallback as-is */
        }
      }
      return candidate;
    },
  });
};
