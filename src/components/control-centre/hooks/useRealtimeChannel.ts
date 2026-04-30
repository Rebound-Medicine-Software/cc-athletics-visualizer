import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Event = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface Options {
  channelName: string;
  table: string;
  event?: Event;
  schema?: string;
  /** When false, the subscription is not created (e.g. non-super-admin). */
  enabled?: boolean;
  onChange: (payload: any) => void;
}

/**
 * Reusable Supabase realtime subscription. Auto-gated to super_admin so we
 * never expose Control Centre streams to other roles.
 */
export const useRealtimeChannel = ({
  channelName,
  table,
  event = 'INSERT',
  schema = 'public',
  enabled = true,
  onChange,
}: Options) => {
  const { profile } = useAuth();
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    if (profile?.role !== 'super_admin') return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event, schema, table },
        (payload: any) => cbRef.current(payload),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, event, schema, enabled, profile?.role]);
};

export const usePlatformActivityRealtime = (onInsert: (row: any) => void, enabled = true) =>
  useRealtimeChannel({
    channelName: 'cc-platform-activity',
    table: 'platform_activity_logs',
    event: 'INSERT',
    enabled,
    onChange: (p) => onInsert(p.new),
  });

export const useIntegrationHealthRealtime = (onInsert: (row: any) => void, enabled = true) =>
  useRealtimeChannel({
    channelName: 'cc-integration-health',
    table: 'integration_health_logs',
    event: 'INSERT',
    enabled,
    onChange: (p) => onInsert(p.new),
  });

export const useTestDataRealtime = (onInsert: (row: any) => void, enabled = true) =>
  useRealtimeChannel({
    channelName: 'cc-test-data',
    table: 'test_data',
    event: 'INSERT',
    enabled,
    onChange: (p) => onInsert(p.new),
  });

export const useImpersonationRealtime = (onChange: (payload: any) => void, enabled = true) =>
  useRealtimeChannel({
    channelName: 'cc-impersonation-logs',
    table: 'super_admin_impersonation_logs',
    event: '*',
    enabled,
    onChange,
  });
