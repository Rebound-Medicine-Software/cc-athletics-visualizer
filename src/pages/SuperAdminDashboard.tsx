import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard';

const SuperAdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();

  // Check if user is super admin and specifically the allowed email
  if (!profile || profile.role !== 'super_admin' || profile.email !== 'reflexsportstherapyy@gmail.com') {
    return <Navigate to="/admin" replace />;
  }

  return <SuperAdminDashboard />;
};

export default SuperAdminDashboardPage;