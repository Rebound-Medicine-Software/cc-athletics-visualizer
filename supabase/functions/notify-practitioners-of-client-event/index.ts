import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

/**
 * notify-practitioners-of-client-event
 *
 * Closes the engagement loop between athletes/clients and their practitioners.
 *
 * Inserts a `platform_in_app_notifications` row for every active practitioner
 * (organisation / staff / practitioner) on the athlete's team — using the
 * service role internally so the client never gains broader insert rights.
 *
 * Auth model:
 *  - Caller must be authenticated.
 *  - Caller must be the linked user_id of the supplied athlete_id, OR a member
 *    of the same team_id (so practitioners can also broadcast e.g. PB events).
 *  - We verify both via service-role lookups; the caller never sees other users.
 */

interface Payload {
  athlete_id: string;
  event_type: 'retest_request' | 'milestone' | 'programme_completed' | 'personal_best';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Resolve caller from JWT
    const { data: userRes, error: userErr } = await admin.auth.getUser(auth.replace('Bearer ', ''));
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = userRes.user.id;

    const body = (await req.json()) as Payload;
    if (!body?.athlete_id || !body?.event_type || !body?.title || !body?.message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up athlete + team
    const { data: athlete, error: aErr } = await admin
      .from('athletes')
      .select('id, name, team_id, user_id')
      .eq('id', body.athlete_id)
      .maybeSingle();
    if (aErr || !athlete) {
      return new Response(JSON.stringify({ error: 'Athlete not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorise caller: must be the athlete OR a same-team profile
    let authorised = athlete.user_id === callerId;
    if (!authorised) {
      const { data: profile } = await admin
        .from('profiles')
        .select('team_id, role')
        .eq('user_id', callerId)
        .maybeSingle();
      authorised = !!profile && profile.team_id === athlete.team_id;
    }
    if (!authorised) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recipients: practitioners on the same team
    const { data: practitioners, error: pErr } = await admin
      .from('profiles')
      .select('user_id')
      .eq('team_id', athlete.team_id)
      .in('role', ['organisation', 'staff', 'practitioner', 'super_admin']);
    if (pErr) throw pErr;

    const rows = (practitioners ?? [])
      .filter((p) => !!p.user_id && p.user_id !== callerId)
      .map((p) => ({
        recipient_user_id: p.user_id,
        team_id: athlete.team_id,
        title: body.title,
        message: body.message,
        severity: 'info',
        metadata: {
          ...(body.metadata ?? {}),
          notification_type: body.event_type,
          source: 'client_event_broadcast',
          athlete_id: athlete.id,
          athlete_name: athlete.name,
        },
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: insErr } = await admin.from('platform_in_app_notifications').insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, delivered: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-practitioners-of-client-event error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
