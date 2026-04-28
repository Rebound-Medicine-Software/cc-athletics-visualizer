// Shared platform activity logging helper for edge functions.
// Writes to public.platform_activity_logs using the service role.
// Never throws — failures are swallowed so they never break the calling function.

interface LogActivityArgs {
  eventType: string;
  eventSource: string;
  severity?: 'info' | 'warning' | 'critical' | 'success';
  teamId?: string | null;
  userId?: string | null;
  athleteId?: string | null;
  organisationName?: string | null;
  metadata?: Record<string, unknown>;
}

let cachedClient: any = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.0');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

export async function logActivity(args: LogActivityArgs): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    await client.from('platform_activity_logs').insert({
      event_type: args.eventType,
      event_source: args.eventSource,
      severity: args.severity ?? 'info',
      team_id: args.teamId ?? null,
      user_id: args.userId ?? null,
      athlete_id: args.athleteId ?? null,
      organisation_name: args.organisationName ?? null,
      metadata: args.metadata ?? {},
    });
  } catch (err) {
    console.error('[logActivity] failed', err);
  }
}

export async function logIntegrationHealth(
  integrationName: string,
  status: 'success' | 'failed',
  opts: { teamId?: string | null; latencyMs?: number; failureReason?: string; payload?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    await client.from('integration_health_logs').insert({
      integration_name: integrationName,
      status,
      team_id: opts.teamId ?? null,
      latency_ms: opts.latencyMs ?? null,
      failure_reason: opts.failureReason ?? null,
      payload: opts.payload ?? {},
    });
  } catch (err) {
    console.error('[logIntegrationHealth] failed', err);
  }
}
