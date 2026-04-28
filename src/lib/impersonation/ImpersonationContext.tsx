import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'cc_impersonation_v1';

export interface ImpersonationState {
  teamId: string;
  teamName: string;
  logId: string;
  startedAt: string;
  reason: string;
  superAdminId: string;
}

interface ImpersonationContextValue {
  impersonation: ImpersonationState | null;
  startImpersonation: (args: {
    teamId: string;
    teamName: string;
    reason: string;
    superAdminId: string;
  }) => Promise<{ error: string | null }>;
  endImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | undefined>(undefined);

const readStored = (): ImpersonationState | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationState) : null;
  } catch {
    return null;
  }
};

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(() => readStored());

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setImpersonation(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const startImpersonation: ImpersonationContextValue['startImpersonation'] = useCallback(
    async ({ teamId, teamName, reason, superAdminId }) => {
      try {
        const { data, error } = await supabase
          .from('super_admin_impersonation_logs')
          .insert({
            super_admin_id: superAdminId,
            team_id: teamId,
            reason,
          })
          .select('id, started_at')
          .single();

        if (error || !data) {
          return { error: error?.message || 'Failed to log impersonation' };
        }

        const state: ImpersonationState = {
          teamId,
          teamName,
          logId: data.id,
          startedAt: data.started_at,
          reason,
          superAdminId,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setImpersonation(state);
        return { error: null };
      } catch (e: any) {
        return { error: e?.message || 'Unexpected error' };
      }
    },
    [],
  );

  const endImpersonation: ImpersonationContextValue['endImpersonation'] = useCallback(async () => {
    const current = readStored();
    if (current) {
      try {
        await supabase
          .from('super_admin_impersonation_logs')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', current.logId);
      } catch (e) {
        console.warn('Failed to mark impersonation ended', e);
      }
    }
    sessionStorage.removeItem(STORAGE_KEY);
    setImpersonation(null);
  }, []);

  return (
    <ImpersonationContext.Provider value={{ impersonation, startImpersonation, endImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
};
