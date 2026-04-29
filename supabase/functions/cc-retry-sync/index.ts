// Super Admin–triggered manual retry of CC Athletics sync for one organisation.
// Invokes the existing sync-cc-athletics function and records the outcome via record_cc_athletics_retry RPC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // Caller-bound client for is_super_admin gating
  const callerClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { team_uuid, reason } = await req.json();
    if (!team_uuid || !reason || String(reason).trim().length < 3) {
      return new Response(JSON.stringify({ error: 'team_uuid and reason (min 3 chars) required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Gate: must be super admin
    const { data: isAdmin, error: adminErr } = await callerClient.rpc('is_super_admin');
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: 'unauthorised' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const start = Date.now();
    let status: 'success' | 'failed' = 'success';
    let failureReason: string | null = null;
    let recordCount: number | null = null;

    try {
      const { data, error } = await adminClient.functions.invoke('sync-cc-athletics', {
        body: { team_id: team_uuid, manual_retry: true },
      });
      if (error) throw error;
      recordCount = (data as any)?.record_count ?? (data as any)?.athlete_count ?? null;
    } catch (e: any) {
      status = 'failed';
      failureReason = String(e?.message || e).slice(0, 500);
    }

    const latencyMs = Date.now() - start;

    // Record outcome (audit + integration_health_logs)
    await adminClient.rpc('record_cc_athletics_retry', {
      p_team_uuid: team_uuid,
      p_reason: reason,
      p_status: status,
      p_failure_reason: failureReason,
      p_latency_ms: latencyMs,
      p_record_count: recordCount,
    });

    return new Response(JSON.stringify({ ok: status === 'success', status, latency_ms: latencyMs, failure_reason: failureReason, record_count: recordCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
