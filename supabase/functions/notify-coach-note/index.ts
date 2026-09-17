import { corsHeaders } from 'npm:@supabase/supabase-js@2.95.0/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

/**
 * notify-coach-note
 *
 * AthleteReportView.tsx's practitioner "coach note" Save button inserts a
 * platform_in_app_notifications row addressed to the athlete
 * (recipient_user_id = athlete.user_id, i.e. != auth.uid()). That table has
 * no INSERT policy for a practitioner writing into someone else's inbox -
 * only service_role/super_admin FOR ALL, plus a self-only policy added for
 * the "Retest requested" case (framework.md, 14 September 2026 entry). This
 * mirrors notify-review-decision's pattern: do the insert server-side with
 * the service-role key, after checking the caller is actually allowed to
 * message an athlete.
 *
 * Auth model:
 * - Caller must be authenticated.
 * - Caller's own profile role must be practitioner/organisation/super_admin.
 *   No team-scoping check - cross-team access for practitioner/org users is
 *   an existing, intentional design choice (framework.md Section 3, Warning
 *   #5), the same reasoning already applied to client_messages in PR #60.
 */

interface Payload {
    athleteUserId: string;
    teamId: string | null;
    message: string;
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
                   const message = body?.message?.trim();
                   if (!body?.athleteUserId || !message) {
                           return new Response(JSON.stringify({ error: 'Missing fields' }), {
                                     status: 400,
                                     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                           });
                   }

      // Authorise caller: must be a practitioner/organisation/super_admin
      // profile. No team match required - messaging any athlete across any
      // team is the same intentional cross-team design already applied to
      // client_messages.
      const { data: callerProfile } = await admin
                     .from('profiles')
                     .select('role')
                     .eq('user_id', callerId)
                     .maybeSingle();
                   const allowedRoles = ['practitioner', 'organisation', 'super_admin'];
                   if (!callerProfile || !allowedRoles.includes(callerProfile.role)) {
                           return new Response(JSON.stringify({ error: 'Forbidden' }), {
                                     status: 403,
                                     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                           });
                   }

      const { error: insErr } = await admin.from('platform_in_app_notifications').insert({
              recipient_user_id: body.athleteUserId,
              team_id: body.teamId,
              title: '📝 Note from your coach',
              message,
              severity: 'info',
              metadata: { notification_type: 'coach_note' },
      });
                   if (insErr) throw insErr;

      return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
             } catch (e) {
                   console.error('notify-coach-note error:', e);
                   return new Response(JSON.stringify({ error: (e as Error).message }), {
                           status: 500,
                           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                   });
             }
});
