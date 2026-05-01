import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from './useEffectiveTeamId';

/**
 * Effective team context for organisation-scoped surfaces.
 *
 * Returns the impersonated organisation's team row when a Super Admin
 * is in View-As mode, otherwise the logged-in user's own team. All
 * organisation-side reads/writes should source `team_id` from this hook
 * (via `teamId`), never from `profile.team_id`.
 */
export interface EffectiveTeam {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_family: string | null;
  tier_id: string | null;
  setup_data: Record<string, any> | null;
}

export const useEffectiveTeam = () => {
  const { teamId, isImpersonating, impersonatedTeamName } = useEffectiveTeamId();

  const query = useQuery({
    queryKey: ['effective-team', teamId],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<EffectiveTeam | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, primary_color, secondary_color, accent_color, font_family, tier_id, setup_data')
        .eq('id', teamId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  return {
    teamId,
    team: query.data ?? null,
    isImpersonating,
    impersonatedTeamName,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

/**
 * Effective tier permissions for the current effective team.
 * Used by `hasPermission` consumers so View-As reflects the impersonated
 * organisation's entitlements rather than the Super Admin's (often empty) tier.
 */
export interface EffectiveTier {
  id: string;
  name: string;
  price_monthly: number | null;
  can_view_analytics: boolean;
  can_edit_programming: boolean;
  can_export_reports: boolean;
  can_adjust_sets_reps: boolean;
  can_use_ai_coach: boolean;
  max_bookings_per_month: number | null;
}

export const useEffectiveTier = () => {
  const { profile } = useAuth();
  const { teamId, isImpersonating } = useEffectiveTeamId();
  const { team } = useEffectiveTeam();

  // Choose tier source:
  // - Impersonating: use the impersonated team's tier_id
  // - Otherwise: use the logged-in user's own tier_id (preserves prior behaviour)
  const tierId = isImpersonating ? team?.tier_id ?? null : profile?.tier_id ?? null;

  const query = useQuery({
    queryKey: ['effective-tier', tierId, teamId],
    enabled: !!tierId,
    staleTime: 60_000,
    queryFn: async (): Promise<EffectiveTier | null> => {
      if (!tierId) return null;
      const { data, error } = await supabase
        .from('tiers')
        .select('id, name, price_monthly, can_view_analytics, can_edit_programming, can_export_reports, can_adjust_sets_reps, can_use_ai_coach, max_bookings_per_month')
        .eq('id', tierId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const tier = query.data ?? null;

  const hasPermission = (perm: keyof Pick<EffectiveTier,
    'can_view_analytics' | 'can_edit_programming' | 'can_export_reports' | 'can_adjust_sets_reps' | 'can_use_ai_coach'>): boolean => {
    // During View-As, if the impersonated org has no tier yet, default to allowing
    // tenant feature visibility (Super Admin should not be locked out by missing tier).
    if (isImpersonating && !tier) return true;
    return Boolean(tier?.[perm]);
  };

  return { tier, hasPermission, isLoading: query.isLoading };
};
