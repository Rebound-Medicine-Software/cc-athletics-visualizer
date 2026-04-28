import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityRow {
  id: string;
  event_type: string;
  event_source: string | null;
  severity: string | null;
  organisation_name: string | null;
  team_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const useGlobalActivityFeed = (limit = 20) => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_global_activity_feed', {
          limit_count: limit,
        });
        if (!alive) return;
        if (error) {
          console.error('get_global_activity_feed failed', error);
          setRows([]);
        } else {
          setRows((data ?? []) as ActivityRow[]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [limit]);

  return { rows, loading };
};
