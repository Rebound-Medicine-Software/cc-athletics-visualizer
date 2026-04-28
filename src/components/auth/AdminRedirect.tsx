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

  const orgStatus = (profile as any).organisation_status as string | undefined;
  const onboardingStatus = (profile as any).onboarding_status as string | undefined;

  const destination = resolveRoleHome(profile.role, orgStatus, onboardingStatus);
  return <Navigate to={destination} replace />;
};

export default AdminRedirect;
