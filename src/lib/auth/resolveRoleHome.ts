/**
 * Centralized role-to-home resolver.
 *
 * Given a user's role (and optional org status flags), returns the
 * canonical destination route for that user.
 *
 * Used by <ProtectedRoute />, <RoleGate />, and <SuperAdminGate />
 * to keep redirect logic consistent across the app.
 */

export type ResolvableRole =
  | 'super_admin'
  | 'organisation'
  | 'practitioner'
  | 'clinician' // legacy alias, treated as practitioner
  | 'client'
  | string
  | null
  | undefined;

export type OrganisationStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | string
  | null
  | undefined;

export type OnboardingStatus =
  | 'complete'
  | 'incomplete'
  | 'pending'
  | string
  | null
  | undefined;

export const DEFAULT_FALLBACK_ROUTE = '/auth';

export function resolveRoleHome(
  role: ResolvableRole,
  organisationStatus?: OrganisationStatus,
  onboardingStatus?: OnboardingStatus
): string {
  switch (role) {
    case 'super_admin':
      return '/control-centre';

    case 'organisation': {
      const onboardingIncomplete =
        onboardingStatus === 'incomplete' ||
        onboardingStatus === 'pending' ||
        organisationStatus === 'pending';
      return onboardingIncomplete ? '/setup' : '/dashboard';
    }

    case 'practitioner':
    case 'clinician':
      return '/dashboard';

    case 'client':
      return '/Dashboard(Client)';

    default:
      return DEFAULT_FALLBACK_ROUTE;
  }
}
