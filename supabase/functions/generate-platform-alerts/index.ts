// Scans recent telemetry and creates / resolves entries in public.platform_alerts.
// Idempotent thanks to the partial unique index on (alert_type, team_id) WHERE NOT is_resolved.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertCandidate {
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  team_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const candidates: AlertCandidate[] = [];

  try {
    // 1) Edge function / integration failures in the last 24h, grouped by integration_name.
    const { data: failures } = await supabase
      .from('integration_health_logs')
      .select('integration_name')
      .eq('status', 'failed')
      .gte('logged_at', dayAgo);

    const byIntegration: Record<string, number> = {};
    (failures ?? []).forEach((r: any) => {
      byIntegration[r.integration_name] = (byIntegration[r.integration_name] ?? 0) + 1;
    });
    for (const [name, count] of Object.entries(byIntegration)) {
      if (count >= 3) {
        candidates.push({
          alert_type: `integration_failure:${name}`,
          severity: count >= 10 ? 'critical' : 'warning',
          title: `Integration failures: ${name}`,
          description: `${count} failed calls to ${name} in the last 24h.`,
          team_id: null,
        });
      }
    }

    // 2) Organisations with low engagement (< 5 logins in 7 days, but org has been active).
    const { data: lowEngTeams } = await supabase.rpc('get_organisation_health');
    (lowEngTeams ?? []).forEach((t: any) => {
      if ((t.practitioner_count ?? 0) > 0 && (t.churn_risk ?? 0) >= 60) {
        candidates.push({
          alert_type: 'org_at_risk',
          severity: 'warning',
          title: `Organisation at churn risk: ${t.organisation_name}`,
          description: `Churn score ${Number(t.churn_risk ?? 0).toFixed(0)} — engagement below threshold.`,
          team_id: t.team_id,
        });
      }
    });

    // 3) Open critical activity events in the last 24h (e.g., signup_failed, report_failed).
    const { data: criticalEvents } = await supabase
      .from('platform_activity_logs')
      .select('event_type, team_id')
      .eq('severity', 'critical')
      .gte('created_at', dayAgo);

    const criticalByType: Record<string, number> = {};
    (criticalEvents ?? []).forEach((r: any) => {
      criticalByType[r.event_type] = (criticalByType[r.event_type] ?? 0) + 1;
    });
    for (const [type, count] of Object.entries(criticalByType)) {
      if (count >= 2) {
        candidates.push({
          alert_type: `critical_event:${type}`,
          severity: 'critical',
          title: `Repeated critical event: ${type.replace(/_/g, ' ')}`,
          description: `${count} occurrences in last 24h.`,
          team_id: null,
        });
      }
    }

    // Insert each candidate, swallowing unique-violation conflicts (already-open alert).
    let inserted = 0;
    for (const c of candidates) {
      const { error } = await supabase.from('platform_alerts').insert({
        alert_type: c.alert_type,
        severity: c.severity,
        title: c.title,
        description: c.description,
        team_id: c.team_id,
        is_resolved: false,
      });
      if (!error) {
        inserted++;
      } else if (!String(error.message ?? '').toLowerCase().includes('duplicate')) {
        console.error('alert insert', c.alert_type, error);
      }
    }

    // Auto-resolve integration_failure alerts if no failures in last hour.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('integration_health_logs')
      .select('integration_name')
      .eq('status', 'failed')
      .gte('logged_at', hourAgo);
    const stillFailing = new Set((recent ?? []).map((r: any) => r.integration_name));

    const { data: openAlerts } = await supabase
      .from('platform_alerts')
      .select('id, alert_type')
      .eq('is_resolved', false)
      .like('alert_type', 'integration_failure:%');

    let resolved = 0;
    for (const a of openAlerts ?? []) {
      const integ = (a.alert_type as string).split(':')[1];
      if (!stillFailing.has(integ)) {
        const { error } = await supabase.from('platform_alerts')
          .update({ is_resolved: true })
          .eq('id', a.id);
        if (!error) resolved++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      candidates: candidates.length,
      inserted,
      resolved,
      sevenDaysAgo,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('generate-platform-alerts error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
