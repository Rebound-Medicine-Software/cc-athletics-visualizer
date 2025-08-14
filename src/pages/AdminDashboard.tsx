import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';
import { PractitionerDashboard } from '@/components/admin/PractitionerDashboard';
import { ClientDashboard } from '@/components/admin/ClientDashboard';
import { CreateAdminUser } from '@/components/admin/CreateAdminUser';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const AdminDashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no profile, show admin setup page (for initial super admin creation)
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" />
              Admin Panel Setup
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create the first super admin account to access the admin panel
            </p>
          </CardHeader>
          <CardContent>
            <CreateAdminUser />
          </CardContent>
        </Card>
      </div>
    );
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