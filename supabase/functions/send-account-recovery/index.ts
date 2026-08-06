import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logActivity } from "../_shared/logActivity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccountRecoveryRequest {
  contactInfo: string;
  userRole: 'clinician' | 'athlete';
  fullRecovery: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactInfo, userRole, fullRecovery }: AccountRecoveryRequest = await req.json();

  console.log(`Processing full account recovery request for ${userRole}: ${contactInfo}`);

  // SendPulse is fully retired (confirmed by Josh, 5 Aug 2026) - this used to email
  // support@reboundmedicine.co via SendPulse, which has been dead ever since, meaning
  // every "forgotten email + password" request silently vanished. There's no existing
  // Pingram/NotificationAPI template for this internal support-alert flow yet, so rather
  // than leave it going nowhere, the request is now logged to platform_activity_logs
  // (visible in the Control Centre) as a critical event so Josh/super admins can actually
  // see and action it. Swap this for a real Pingram-templated email once that template exists.
  await logActivity({
    eventType: 'account_recovery_requested_full',
    eventSource: 'send-account-recovery',
    severity: 'critical',
    metadata: {
      contactInfo,
      userRole,
      fullRecovery,
      requestedAt: new Date().toISOString(),
      note: 'Forgotten email + password. Verify identity before assisting - HIPAA-compliant platform.',
    },
  });

  console.log("High-priority account recovery request logged successfully");

  return new Response(
    JSON.stringify({
      success: true,
      message: "Account recovery request submitted successfully. Our security team will verify your identity and contact you within 48 hours."
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
    );

  } catch (error: any) {
    console.error("Error in send-account-recovery function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
      );
  }
};

serve(handler);
