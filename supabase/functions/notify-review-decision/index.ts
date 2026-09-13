import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

/**
 * notify-review-decision
 *
 * In-app notifications for the "Submit for review" workflow (framework.md
 * Section 4 Item 1). test_data has no submitted_by column, so on rejection
 * this notifies every active practitioner/org member on the team rather
 * than just the original submitter - same fan-out shape already used by
 * notify-practitioners-of-client-event.
 *
 * Auth model:
 * - Caller must be authenticated.
 * - Caller must be a profile on the supplied teamId (any role) - verified
 *   via a service-role lookup so the client never gains broader insert rights.
 */

interface Payload {
  teamId: string;
  athleteName: string;
  testName: string;
  testDate: string;
  action: 'submitted_for_review' | 'rejected';
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

    const { data: userRes, error: userErr } = await admin.auth.getUser(auth.replace('Bearer ', ''));
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = userRes.user.id;

    const body = (await req.json()) as Payload;
    if (!body?.teamId || !body?.athleteName || !body?.testName || !body?.action) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorise caller: must be a profile on this team.
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('team_id')
      .eq('user_id', callerId)
      .maybeSingle();
    if (!callerProfile || callerProfile.team_id !== body.teamId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recipients depend on the action: the org admin gets told when
    // something needs their sign-off; everyone else on the team gets told
    // when a decision (rejection) has been made, since there's no
    // submitted_by column to notify just the original practitioner.
    const roles = body.action === 'submitted_for_review'
      ? ['organisation']
      : ['organisation', 'staff', 'practitioner'];

    const { data: recipients, error: rErr } = await admin
      .from('profiles')
      .select('user_id')
      .eq('team_id', body.teamId)
      .in('role', roles);
    if (rErr) throw rErr;

    const title = body.action === 'submitted_for_review'
      ? 'Test result submitted for review'
      : 'Test result rejected';
    const message = body.action === 'submitted_for_review'
      ? `${body.athleteName}'s ${body.testName} result is waiting for your approval.`
      : `${body.athleteName}'s ${body.testName} result was rejected and will not appear on their progress view.`;

    const rows = (recipients ?? [])
      .filter((p) => !!p.user_id && p.user_id !== callerId)
      .map((p) => ({
        recipient_user_id: p.user_id,
        team_id: body.teamId,
        title,
        message,
        severity: 'info',
        metadata: {
          notification_type: `review_workflow_${body.action}`,
          athlete_name: body.athleteName,
          test_name: body.testName,
          test_date: body.testDate,
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
    console.error('notify-review-decision error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
