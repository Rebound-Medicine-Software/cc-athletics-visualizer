// Computes a daily organisation_health_metrics snapshot per team.
// Triggered by pg_cron. Idempotent per (team_id, snapshot_date) via upsert.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString();

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, name');
    if (teamsErr) throw teamsErr;

    let processed = 0;
    let lastActivityUpdates = 0;

    for (const team of teams ?? []) {
      const tid = team.id as string;

      const [
        practitioners,
        athletes,
        testsLogged,
        bookingsCount,
        loginsCount,
        apiFailures,
        consentSigned,
        consentTotal,
        reportsAgg,
        sub,
        lastLogin,
        lastTest,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .eq('team_id', tid).in('role', ['practitioner', 'organisation']),
        supabase.from('athletes').select('id', { count: 'exact', head: true }).eq('team_id', tid),
        supabase.from('test_data').select('athlete_id, athletes!inner(team_id)', { count: 'exact', head: true })
          .eq('athletes.team_id', tid).gte('created_at', monthIso),
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq('team_id', tid).gte('appointment_date', monthIso),
        supabase.from('login_events').select('id', { count: 'exact', head: true })
          .eq('team_id', tid).gte('created_at', thirtyDaysAgo),
        supabase.from('integration_health_logs').select('id', { count: 'exact', head: true })
          .eq('team_id', tid).eq('status', 'failed').gte('logged_at', dayAgo),
        supabase.from('athletes').select('id', { count: 'exact', head: true })
          .eq('team_id', tid).eq('consent_status', 'signed'),
        supabase.from('athletes').select('id', { count: 'exact', head: true }).eq('team_id', tid),
        supabase.from('athletes').select('reports_sent_count').eq('team_id', tid),
        supabase.from('billing_subscriptions').select('monthly_value, status')
          .eq('team_id', tid).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('login_events').select('created_at').eq('team_id', tid)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('athletes').select('last_test_at').eq('team_id', tid)
          .order('last_test_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      ]);

      const reportsGenerated = (reportsAgg.data ?? []).reduce(
        (sum: number, r: any) => sum + (r.reports_sent_count ?? 0), 0,
      );
      const consentRate = (consentTotal.count ?? 0) > 0
        ? Math.round(((consentSigned.count ?? 0) / (consentTotal.count ?? 1)) * 1000) / 10
        : 0;

      const loginCount = loginsCount.count ?? 0;
      const tests = testsLogged.count ?? 0;
      // Engagement score: composite of logins + tests + bookings (capped at 100).
      const engagement = Math.min(100, Math.round(loginCount * 1.5 + tests * 0.5 + (bookingsCount.count ?? 0) * 1));
      // Churn risk: inverse of engagement & login activity, plus failure penalty.
      const churn = Math.max(0, Math.min(100, Math.round(60 - engagement * 0.5 + (apiFailures.count ?? 0) * 2)));

      // Resolve a "last activity" timestamp from the most recent of: login, test.
      const candidates: Array<string | null | undefined> = [
        lastLogin.data?.created_at as string | undefined,
        lastTest.data?.last_test_at as string | undefined,
      ];
      const lastActivity = candidates.filter(Boolean).sort().pop();

      const { error: upsertErr } = await supabase
        .from('organisation_health_metrics')
        .upsert({
          team_id: tid,
          snapshot_date: today,
          practitioner_count: practitioners.count ?? 0,
          athlete_count: athletes.count ?? 0,
          tests_logged: tests,
          bookings_count: bookingsCount.count ?? 0,
          login_count: loginCount,
          api_failure_count: apiFailures.count ?? 0,
          consent_completion_rate: consentRate,
          revenue: sub.data?.monthly_value ?? 0,
          reports_generated: reportsGenerated,
          ai_requests: 0,
          engagement_score: engagement,
          churn_risk_score: churn,
        }, { onConflict: 'team_id,snapshot_date' });

      if (upsertErr) console.error(`upsert health for ${tid}`, upsertErr);

      // Mirror last_activity + churn onto the team row (used by RPC).
      if (lastActivity) {
        const { error: teamErr } = await supabase.from('teams')
          .update({ last_activity_at: lastActivity, churn_risk_score: churn })
          .eq('id', tid);
        if (!teamErr) lastActivityUpdates++;
      } else {
        await supabase.from('teams').update({ churn_risk_score: churn }).eq('id', tid);
      }

      processed++;
    }

    return new Response(JSON.stringify({ success: true, processed, lastActivityUpdates, snapshot_date: today }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('compute-org-health-snapshots error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
