import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrganisationDetail {
  organisation: {
    id: string;
    name: string;
    cc_team_id: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    logo_url: string | null;
    primary_color: string | null;
    subscription_status: string | null;
    organisation_status: string | null;
    churn_risk_score: number | null;
    created_at: string | null;
    last_activity_at: string | null;
    tier_name: string | null;
    owner_email: string | null;
    owner_full_name: string | null;
    cc_athletics_connected: boolean | null;
    calcom_connected: boolean | null;
    notificationapi_connected: boolean | null;
  } | null;
  practitioner_count: number;
  athlete_count: number;
  tests_this_month: number;
  bookings_this_month: number;
  reports_sent_total: number;
  monthly_revenue: number;
  subscription: {
    tier_name: string | null;
    status: string | null;
    payment_status: string | null;
    monthly_value: number | null;
    seat_count: number | null;
    renewal_date: string | null;
  } | null;
  latest_health: Record<string, any> | null;
  recent_activity: Array<{
    id: string;
    event_type: string;
    event_source: string | null;
    severity: string | null;
    metadata: any;
    organisation_name: string | null;
    created_at: string;
  }>;
  unresolved_alerts: Array<{
    id: string;
    alert_type: string;
    severity: string;
    title: string | null;
    description: string | null;
    created_at: string;
  }>;
  integration_health: Array<{
    integration_name: string;
    failure_count: number;
    success_count: number;
    last_logged_at: string | null;
    last_failure_reason: string | null;
  }>;
}

export const useOrganisationDetail = (teamId: string | null) => {
  const [data, setData] = useState<OrganisationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) { setData(null); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    (supabase as any).rpc('get_organisation_detail', { team_uuid: teamId })
      .then(({ data: d, error: e }: any) => {
        if (!alive) return;
        if (e) { setError(e.message); setData(null); }
        else setData(d as OrganisationDetail);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [teamId]);

  return { data, loading, error };
};
