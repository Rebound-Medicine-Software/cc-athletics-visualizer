import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useImpersonation } from '@/lib/impersonation/ImpersonationContext';
import { resolveRoleHome } from '@/lib/auth/resolveRoleHome';
import AuthLoading from './AuthLoading';

type AllowedRole = UserRole | 'practitioner' | 'organisation';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: AllowedRole[];
  /**
   * Optional override — where to redirect when role is not permitted.
   * If omitted, uses resolveRoleHome(profile.role, ...).
   */
  fallbackRoute?: string;
}

/**
 * <RoleGate allowedRoles={[...]} />
 *
 * Requires that the loaded profile.role is included in allowedRoles.
 * If not permitted, redirects the user to their canonical home route via
 * resolveRoleHome(role, organisation_status, onboarding_status).
 *
 * NOTE: Should be used INSIDE <ProtectedRoute /> so that user/profile
 * are guaranteed to be loaded.
 *
 * Usage:
 *   <ProtectedRoute>
 *     <RoleGate allowedRoles={['super_admin']}>
 *       <ControlCentre />
 *     </RoleGate>
 *   </ProtectedRoute>
 */
const RoleGate: React.FC<RoleGateProps> = ({
  children,
  allowedRoles,
  fallbackRoute,
}) => {
  const { profile, loading } = useAuth();
  const { impersonation } = useImpersonation();

  if (loading) {
    return <AuthLoading label="Verifying access…" />;
  }

  if (!profile) {
    // ProtectedRoute should normally prevent this, but be safe.
    return <Navigate to="/auth" replace />;
  }

  const role = profile.role as AllowedRole;
  const isAllowed = allowedRoles.includes(role);

  // While a super admin is impersonating an organisation, allow them to
  // traverse organisation/practitioner gates as a read-only "view-as".
  const isSuperAdminImpersonating =
    role === 'super_admin' &&
    !!impersonation &&
    (allowedRoles.includes('organisation' as AllowedRole) ||
      allowedRoles.includes('practitioner' as AllowedRole) ||
      allowedRoles.includes('clinician' as AllowedRole));

  if (isAllowed || isSuperAdminImpersonating) {
    return <>{children}</>;
  }

    // `profiles` has no organisation_status/onboarding_status columns -
    // organisation_status lives on `teams`, and onboarding_status doesn't
    // exist anywhere in the schema. Those were always undefined here, so
    // this fallback redirect never actually detected incomplete onboarding.
    // The real flag is profiles.setup_completed (boolean) - the same one
    // src/pages/Auth.tsx already uses for this exact org redirect check.
    const onboardingStatus =
      profile.setup_completed === false ? 'incomplete' : 'complete';

    const destination =
      fallbackRoute ?? resolveRoleHome(role, undefined, onboardingStatus);

  return <Navigate to={destination} replace />;
};

export default RoleGate;
