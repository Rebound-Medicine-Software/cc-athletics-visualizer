import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';
import { PractitionerDashboard } from '@/components/admin/PractitionerDashboard';
import { ClientDashboard } from '@/components/admin/ClientDashboard';
import { CreateAdminUser } from '@/components/admin/CreateAdminUser';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminPasswordSetup from '@/components/admin/AdminPasswordSetup';
import { AdminDashboardSheet } from '@/components/admin/AdminDashboardSheet';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';

const AdminDashboard = () => {
  const { profile, loading, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Check if this is a password recovery flow
  const isRecovery = searchParams.get('type') === 'recovery';
  
  // If it's a recovery flow, show the password setup component
  if (isRecovery) {
    return <AdminPasswordSetup />;
  }

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
              Admin Panel
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Access the admin panel or create the first super admin account
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="setup">Create Admin</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <AdminLogin onLoginSuccess={() => {
                  refreshProfile();
                  window.location.href = '/admin(Dashboard)';
                }} />
              </TabsContent>
              
              <TabsContent value="setup">
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    Create the first super admin account to access the admin panel
                  </div>
                  <CreateAdminUser />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  switch (profile.role) {
    case 'super_admin':
      // Redirect to the dashboard route for super admins
      return <Navigate to="/admin(Dashboard)" replace />;
    case 'organisation':
    case 'clinician':
    case 'client':
      // Redirect Clinicians (Consumer 1) and Athletes/Patients (Consumer 2) to auth
      return <Navigate to="/auth" replace />;
    default:
      return <Navigate to="/auth" replace />;
  }
};

export default AdminDashboard;