export { default as ProtectedRoute } from './ProtectedRoute';
export { default as RoleGate } from './RoleGate';
export { default as SuperAdminGate } from './SuperAdminGate';
export { default as AuthLoading } from './AuthLoading';
export { resolveRoleHome } from '@/lib/auth/resolveRoleHome';
export type {
  ResolvableRole,
  OrganisationStatus,
  OnboardingStatus,
} from '@/lib/auth/resolveRoleHome';
