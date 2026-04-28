import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Closes any super_admin_impersonation_logs row where:
 *   - ended_at IS NULL
 *   - started_at < now() - interval '8 hours'
 *
 * For each stale row, sets ended_at = started_at + interval '8 hours'
 * and appends an "[auto-closed: stale > 8h]" marker to `reason`.
 *
 * Designed to be invoked by a pg_cron schedule (every 15 min) and
 * also callable manually by super admins for ad-hoc cleanup.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const cutoffIso = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    const { data: stale, error: selErr } = await admin
      .from('super_admin_impersonation_logs')
      .select('id, started_at, reason')
      .is('ended_at', null)
      .lt('started_at', cutoffIso);

    if (selErr) throw selErr;

    let closed = 0;
    for (const row of stale ?? []) {
      const endedAt = new Date(
        new Date(row.started_at as string).getTime() + 8 * 60 * 60 * 1000,
      ).toISOString();
      const newReason = `${row.reason ?? ''} [auto-closed: stale > 8h]`.trim();

      const { error: upErr } = await admin
        .from('super_admin_impersonation_logs')
        .update({ ended_at: endedAt, reason: newReason })
        .eq('id', row.id);

      if (!upErr) closed += 1;
      else console.warn('Failed to close impersonation log', row.id, upErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, scanned: stale?.length ?? 0, closed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e: any) {
    console.error('cleanup-stale-impersonations error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
