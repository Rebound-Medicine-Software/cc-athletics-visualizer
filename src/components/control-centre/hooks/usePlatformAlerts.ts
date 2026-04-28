import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AlertRow {
  id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string | null;
  description: string | null;
  team_id: string | null;
  is_resolved: boolean;
  created_at: string;
}

export const usePlatformAlerts = () => {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_platform_alerts');
        if (!alive) return;
        if (error) {
          console.error('get_platform_alerts failed', error);
          setAlerts([]);
        } else {
          setAlerts((data ?? []) as AlertRow[]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { alerts, loading };
};
