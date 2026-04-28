import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
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

  if (loading) {
    return <AuthLoading label="Verifying access…" />;
  }

  if (!profile) {
    // ProtectedRoute should normally prevent this, but be safe.
    return <Navigate to="/auth" replace />;
  }

  const role = profile.role as AllowedRole;
  const isAllowed = allowedRoles.includes(role);

  if (isAllowed) {
    return <>{children}</>;
  }

  const orgStatus = (profile as any).organisation_status as
    | string
    | undefined;
  const onboardingStatus = (profile as any).onboarding_status as
    | string
    | undefined;

  const destination =
    fallbackRoute ?? resolveRoleHome(role, orgStatus, onboardingStatus);

  return <Navigate to={destination} replace />;
};

export default RoleGate;
