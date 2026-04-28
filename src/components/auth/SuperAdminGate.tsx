import React from 'react';
import RoleGate from './RoleGate';

interface SuperAdminGateProps {
  children: React.ReactNode;
}

/**
 * <SuperAdminGate />
 *
 * Shorthand for <RoleGate allowedRoles={['super_admin']}>.
 * Non-super-admins are redirected to their correct portal home
 * via resolveRoleHome(...).
 *
 * Usage:
 *   <ProtectedRoute>
 *     <SuperAdminGate>
 *       <ControlCentre />
 *     </SuperAdminGate>
 *   </ProtectedRoute>
 */
const SuperAdminGate: React.FC<SuperAdminGateProps> = ({ children }) => {
  return <RoleGate allowedRoles={['super_admin']}>{children}</RoleGate>;
};

export default SuperAdminGate;
