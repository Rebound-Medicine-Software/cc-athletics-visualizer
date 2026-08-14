import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { logActivity } from "../_shared/logActivity.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      try {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            {
              status: 405,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
            );
        }

  const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

  if (!email || !firstName || !lastName) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
      );
  }

  // SendPulse was retired repo-wide (confirmed by Josh, 5 Aug 2026) and this function's
  // welcome-email send was never migrated to a working provider. Supabase Auth already
  // sends its own native confirmation email on signup (see supabase.auth.signUp in
  // src/pages/Auth.tsx), so this was always a secondary nice-to-have, not the account's
  // only confirmation path. Rather than call a dead SendPulse endpoint and swallow the
  // resulting error, this logs the request (audit trail via platform_activity_logs) and
  // returns success with emailSent: false so the caller doesn't report a spurious failure.
  // TODO(Josh): wire this to send-pingram-email once a "welcome" template exists in Pingram.
  console.log('Welcome email requested (no active provider):', email, firstName, lastName);

  await logActivity({
    eventType: 'welcome_email_requested',
    eventSource: 'send-welcome-email',
    severity: 'info',
    metadata: { email, firstName, lastName, provider: 'none (SendPulse retired)' },
  });

  return new Response(
    JSON.stringify({ success: true, emailSent: false }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
    );
      } catch (error: any) {
console.error("Error in send-welcome-email function:", error);
        return new Response(
          JSON.stringify({ error: error.message || 'Failed to process request' }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
          );
      }
});
