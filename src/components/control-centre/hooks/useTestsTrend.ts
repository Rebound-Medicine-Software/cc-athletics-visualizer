import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { periodDelta, shortMonthDay } from './trendUtils';

export interface TestsPoint { name: string; value: number; day: string; }

export const useTestsTrend = (daysBack = 90) => {
  const [data, setData] = useState<TestsPoint[]>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: rows, error } = await (supabase as any).rpc('get_tests_logged_trend', { days_back: daysBack });
        if (!alive) return;
        if (error) { console.error('get_tests_logged_trend', error); setData([]); setDelta(null); return; }
        const points: TestsPoint[] = (rows ?? []).map((r: any) => ({
          name: shortMonthDay(r.day),
          day: r.day,
          value: Number(r.tests_logged_count ?? 0),
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
