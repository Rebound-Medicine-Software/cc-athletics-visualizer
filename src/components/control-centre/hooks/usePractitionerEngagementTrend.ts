import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { periodAvgDelta, shortMonthDay } from './trendUtils';

export interface EngagementPoint { name: string; active: number; target: number; day: string; }

export const usePractitionerEngagementTrend = (daysBack = 90, target = 80) => {
  const [data, setData] = useState<EngagementPoint[]>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: rows, error } = await (supabase as any).rpc('get_practitioner_engagement_trend', { days_back: daysBack });
        if (!alive) return;
        if (error) { console.error('get_practitioner_engagement_trend', error); setData([]); setDelta(null); return; }
        const points: EngagementPoint[] = (rows ?? []).map((r: any) => ({
          name: shortMonthDay(r.day),
          day: r.day,
          active: Number(r.avg_engagement_score ?? 0),
          target,
        }));
        setData(points);
        setDelta(periodAvgDelta(points.map((p) => p.active)));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [daysBack, target]);

  return { data, delta, loading };
};
