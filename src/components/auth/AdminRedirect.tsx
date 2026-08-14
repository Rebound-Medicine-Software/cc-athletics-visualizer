import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resolveRoleHome } from '@/lib/auth/resolveRoleHome';
import AuthLoading from '@/components/auth/AuthLoading';

/**
 * <AdminRedirect />
 *
 * Smart redirect for the legacy /admin entry point.
 * Routes the visitor to the correct portal home based on their role:
 *   - super_admin             → /control-centre
 *   - organisation/practitioner → /dashboard (or /setup if onboarding incomplete)
 *   - client                  → /Dashboard(Client)
 *   - unauthenticated         → /auth
 *
 * Does NOT render the legacy admin shell.
 */
const AdminRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <AuthLoading label="Redirecting…" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return <AuthLoading label="Loading your profile…" />;
  }

  // Same fix as RoleGate.tsx: profiles has no organisation_status/
  // onboarding_status columns - onboarding_status doesn't exist anywhere
  // in the schema, so this was always undefined and organisation users
  // were never routed to /setup from here. Use the real setup_completed
  // flag instead (matches Auth.tsx's own redirect logic).
  const onboardingStatus =
            profile.setup_completed === false ? 'incomplete' : 'complete';

  const destination = resolveRoleHome(profile.role, undefined, onboardingStatus);
  return <Navigate to={destination} replace />;
};

export default AdminRedirect;
