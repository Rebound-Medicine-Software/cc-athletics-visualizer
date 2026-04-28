import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { periodAvgDelta, shortMonthDay } from './trendUtils';

export interface ChurnPoint { name: string; value: number; highRisk: number; day: string; }

export const useChurnRiskTrend = (daysBack = 90) => {
  const [data, setData] = useState<ChurnPoint[]>([]);
  const [delta, setDelta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: rows, error } = await (supabase as any).rpc('get_churn_risk_trend', { days_back: daysBack });
        if (!alive) return;
        if (error) { console.error('get_churn_risk_trend', error); setData([]); setDelta(null); return; }
        const points: ChurnPoint[] = (rows ?? []).map((r: any) => ({
          name: shortMonthDay(r.day),
          day: r.day,
          value: Number(r.avg_churn_risk ?? 0),
          highRisk: Number(r.high_risk_org_count ?? 0),
        }));
        setData(points);
        setDelta(periodAvgDelta(points.map((p) => p.value)));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [daysBack]);

  return { data, delta, loading };
};
