import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/lib/impersonation/ImpersonationContext';

/**
 * Returns the team_id that organisation-scoped queries should use.
 *
 * - When a super admin is actively impersonating an organisation,
 *   returns the impersonated team_id.
 * - Otherwise returns the logged-in user's profile.team_id.
 *
 * Also exposes a flag indicating whether the current view is a
 * super admin "View-As" session, which is used to disable destructive
 * write actions throughout the organisation dashboard.
 */
export const useEffectiveTeamId = (): {
  teamId: string | null;
  isImpersonating: boolean;
  impersonatedTeamName: string | null;
} => {
  const { profile } = useAuth();
  const { impersonation } = useImpersonation();

  if (impersonation && profile?.role === 'super_admin') {
    return {
      teamId: impersonation.teamId,
      isImpersonating: true,
      impersonatedTeamName: impersonation.teamName,
    };
  }

  return {
    teamId: profile?.team_id ?? null,
    isImpersonating: false,
    impersonatedTeamName: null,
  };
};

/**
 * Returns true if the current user is a super admin actively
 * impersonating an organisation. Use this to gate write actions
 * (insert / update / delete) in the organisation dashboard.
 */
export const useIsViewAsMode = (): boolean => {
  const { isImpersonating } = useEffectiveTeamId();
  return isImpersonating;
};
