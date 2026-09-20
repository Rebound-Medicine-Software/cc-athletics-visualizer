import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Manual trigger for the "Close stale (>8h)" button in the Control Centre's
 * Impersonation Audit panel. Closes any super_admin_impersonation_logs row
 * where ended_at IS NULL and started_at < now() - interval '8 hours'.
 *
 * The actual cleanup logic now lives in a SECURITY DEFINER Postgres
 * function, public.cleanup_stale_impersonations() (added by migration
 * 20260919193701), which pg_cron calls directly every 15 minutes - no HTTP
 * hop, no bearer token, nothing for an anon-key holder to call. This edge
 * function used to have no auth check of its own beyond Supabase's default
 * "some validly-signed JWT" requirement, which the public anon key
 * satisfies with no login - that was fine as far as the platform check
 * goes, but meant anyone with the anon key could trigger it directly. Now
 * requires a real authenticated user via auth.getUser(), then the
 * is_super_admin() RPC, same pattern as cc-retry-sync's super-admin-only
 * actions, before running the same cleanup function on demand.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

           try {
             const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
             const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
             const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
             if (!authHeader.startsWith('Bearer ')) {
               return new Response(
                 JSON.stringify({ success: false, error: 'unauthorized' }),
                 { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
                 );
             }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userErr } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
    );
             if (userErr || !userData?.user) {
               return new Response(
                 JSON.stringify({ success: false, error: 'unauthorized' }),
                 { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
                 );
             }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
             const { data: isAdmin, error: adminErr } = await callerClient.rpc('is_super_admin');
             if (adminErr || !isAdmin) {
               return new Response(
                 JSON.stringify({ success: false, error: 'forbidden' }),
                 { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
                 );
             }

  const { data, error } = await admin.rpc('cleanup_stale_impersonations');
             if (error) throw error;

  return new Response(
    JSON.stringify(data ?? { success: true }),
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
