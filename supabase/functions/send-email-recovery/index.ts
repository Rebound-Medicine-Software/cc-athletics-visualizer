import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { logActivity } from "../_shared/logActivity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRecoveryRequest {
  contactInfo: string;
  userRole: 'clinician' | 'athlete';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactInfo, userRole }: EmailRecoveryRequest = await req.json();

  console.log(`Processing email recovery request for ${userRole}: ${contactInfo}`);

  // SendPulse was retired repo-wide (confirmed by Josh, 5 Aug 2026). This function used to
  // email support@reboundmedicine.co via SendPulse to alert the team of an email-only
  // recovery request - that call has been dead since SendPulse was switched off, meaning
  // these requests were silently going nowhere even though the UI told the user "our
  // support team will contact you within 24 hours." Replaced with logActivity so the
  // request is now written to platform_activity_logs (visible in the Control Centre) with
  // severity 'warning' so it's actually surfaced to a super admin instead of vanishing.
  // TODO(Josh): wire this to send-pingram-email once a support-alert template exists in
  // Pingram, so the support team gets a real email/SMS instead of only a dashboard log.
  await logActivity({
    eventType: 'email_recovery_request',
    eventSource: 'send-email-recovery',
    severity: 'warning',
    metadata: {
      contactInfo,
      userRole,
      requestType: 'Email recovery only',
      timestamp: new Date().toISOString(),
    },
  });

  console.log("Email recovery request logged successfully");

  return new Response(
    JSON.stringify({
      success: true,
      message: "Email recovery request submitted successfully. Our support team will contact you within 24 hours."
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    }
    );

  } catch (error: any) {
    console.error("Error in send-email-recovery function:", error);
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
