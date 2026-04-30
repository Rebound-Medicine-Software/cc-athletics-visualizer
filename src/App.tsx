import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/lib/impersonation/ImpersonationContext";
import { ImpersonationBanner } from "@/components/control-centre/primitives/ImpersonationBanner";
import { GlobalCommandPalette } from "@/components/command-palette/CommandPalette";
import { ProtectedRoute, RoleGate, SuperAdminGate } from "@/components/auth";
import AdminRedirect from "@/components/auth/AdminRedirect";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ControlCentre from "./components/control-centre/ControlCentre";

import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Settings from "./pages/Settings";
import AthleteConsent from "./pages/AthleteConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ImpersonationProvider>
            <ImpersonationBanner />
            <GlobalCommandPalette />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/consent" element={<AthleteConsent />} />

            {/* Smart redirect for legacy /admin entry point */}
            <Route path="/admin" element={<AdminRedirect />} />

            {/* Canonical super_admin route */}
            <Route
              path="/control-centre"
              element={
                <ProtectedRoute>
                  <SuperAdminGate>
                    <ControlCentre />
                  </SuperAdminGate>
                </ProtectedRoute>
              }
            />

            {/* Organisation onboarding */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <RoleGate allowedRoles={['organisation']}>
                    <Setup />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* Practitioner / Organisation dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleGate
                    allowedRoles={['organisation', 'practitioner', 'clinician']}
                  >
                    <Dashboard />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* Client portal */}
            <Route
              path="/Dashboard(Client)"
              element={
                <ProtectedRoute>
                  <RoleGate allowedRoles={['client']}>
                    <ClientDashboard />
                  </RoleGate>
                </ProtectedRoute>
              }
            />

            {/* Settings — any authenticated user */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings(Consumer1)"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ImpersonationProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
