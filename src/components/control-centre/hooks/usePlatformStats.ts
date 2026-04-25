import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformStats {
  totalOrganisations: number;
  activeOrganisations: number;
  totalPractitioners: number;
  totalAthletes: number;
  monthlyTests: number;
  totalTests: number;
  monthlyBookings: number;
  totalBookings: number;
  consentSigned: number;
  consentPending: number;
}

export const usePlatformStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthIso = monthAgo.toISOString();

        const [orgs, prac, athletes, testsTotal, testsMonth, bookings, bookingsMonth, consentSigned, consentPending] = await Promise.all([
          supabase.from('teams').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['practitioner', 'organisation']),
          supabase.from('athletes').select('id', { count: 'exact', head: true }),
          supabase.from('test_data').select('id', { count: 'exact', head: true }),
          supabase.from('test_data').select('id', { count: 'exact', head: true }).gte('test_date', monthIso.slice(0, 10)),
          supabase.from('bookings').select('id', { count: 'exact', head: true }),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('appointment_date', monthIso),
          supabase.from('athletes').select('id', { count: 'exact', head: true }).eq('consent_status', 'signed'),
          supabase.from('athletes').select('id', { count: 'exact', head: true }).eq('consent_status', 'pending'),
        ]);

        if (!alive) return;
        setStats({
          totalOrganisations: orgs.count ?? 0,
          activeOrganisations: orgs.count ?? 0,
          totalPractitioners: prac.count ?? 0,
          totalAthletes: athletes.count ?? 0,
          totalTests: testsTotal.count ?? 0,
          monthlyTests: testsMonth.count ?? 0,
          totalBookings: bookings.count ?? 0,
          monthlyBookings: bookingsMonth.count ?? 0,
          consentSigned: consentSigned.count ?? 0,
          consentPending: consentPending.count ?? 0,
        });
      } catch (e) {
        console.error('platform stats failed', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { stats, loading };
};
