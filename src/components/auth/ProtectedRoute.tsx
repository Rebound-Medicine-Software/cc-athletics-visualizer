import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLoading from './AuthLoading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * If true, requires both an authenticated session AND a loaded profile.
   * Defaults to true.
   */
  requireProfile?: boolean;
  /**
   * Where to send unauthenticated users. Defaults to /auth.
   */
  redirectTo?: string;
}

/**
 * <ProtectedRoute />
 *
 * Wraps any page that requires an authenticated Supabase session.
 * - While auth is loading: renders a lightweight spinner.
 * - If no authenticated user: redirects to /auth (preserving location).
 * - If authenticated but profile not yet loaded (and requireProfile=true):
 *   continues to show loading state.
 *
 * Usage:
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireProfile = true,
  redirectTo = '/auth',
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoading label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (requireProfile && !profile) {
    return <AuthLoading label="Loading your profile…" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
