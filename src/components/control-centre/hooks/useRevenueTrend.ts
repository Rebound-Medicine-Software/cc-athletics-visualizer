import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { periodDelta, shortMonthDay } from './trendUtils';

export interface RevenuePoint { name: string; value: number; subs: number; day: string; }

export const useRevenueTrend = (daysBack = 90) => {
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: rows, error } = await (supabase as any).rpc('get_revenue_trend', { days_back: daysBack });
        if (!alive) return;
        if (error) { console.error('get_revenue_trend', error); setData([]); setDelta(null); return; }
        const points: RevenuePoint[] = (rows ?? []).map((r: any) => ({
          name: shortMonthDay(r.day),
          day: r.day,
          value: Number(r.total_revenue ?? 0),
          subs: Number(r.active_subscriptions ?? 0),
        }));
        setData(points);
        setDelta(periodDelta(points.map((p) => p.value)));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [daysBack]);

  return { data, delta, loading };
};
