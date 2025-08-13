import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';
import { PractitionerDashboard } from '@/components/admin/PractitionerDashboard';
import { ClientDashboard } from '@/components/admin/ClientDashboard';
import { Navigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  switch (profile.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'practitioner':
      return <PractitionerDashboard />;
    case 'client':
      return <ClientDashboard />;
    default:
      return <Navigate to="/auth" replace />;
  }
};

export default AdminDashboard;