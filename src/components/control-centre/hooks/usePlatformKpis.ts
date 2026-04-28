import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformKpis {
  total_organisations: number;
  active_organisations: number;
  total_practitioners: number;
  total_athletes: number;
  monthly_tests_logged: number;
  monthly_reports_generated: number;
  monthly_ai_requests: number;
  monthly_revenue: number;
  failed_integrations: number;
}

const ZERO: PlatformKpis = {
  total_organisations: 0,
  active_organisations: 0,
  total_practitioners: 0,
  total_athletes: 0,
  monthly_tests_logged: 0,
  monthly_reports_generated: 0,
  monthly_ai_requests: 0,
  monthly_revenue: 0,
  failed_integrations: 0,
};

export const usePlatformKpis = () => {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportsTotal, setReportsTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data, error }, reportsAgg] = await Promise.all([
          (supabase as any).rpc('get_platform_kpis'),
          // Canonical reports source for this phase: athletes.reports_sent_count.
          supabase.from('athletes').select('reports_sent_count'),
        ]);
        if (!alive) return;
        if (error) {
          console.error('get_platform_kpis failed', error);
          setKpis(ZERO);
        } else {
          setKpis({ ...ZERO, ...(data as PlatformKpis) });
        }
        const total = (reportsAgg.data ?? []).reduce(
          (s: number, r: any) => s + (r.reports_sent_count ?? 0), 0,
        );
        setReportsTotal(total);
      } catch (e) {
        console.error('usePlatformKpis error', e);
        if (alive) setKpis(ZERO);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { kpis, reportsTotal, loading };
};
