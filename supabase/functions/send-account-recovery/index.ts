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

  // SendPulse was retired repo-wide (confirmed by Josh, 5 Aug 2026). This function used to
  // email support@reboundmedicine.co via SendPulse to alert the team of a full recovery
  // request (email + password both forgotten) - that call has been dead since SendPulse was
  // switched off, meaning these HIGH PRIORITY requests were silently going nowhere even
  // though the UI told the user "our security team will verify your identity within 48
  // hours." Replaced with logActivity so the request is now written to
  // platform_activity_logs (visible in the Control Centre) with severity 'critical' so it's
  // actually surfaced to a super admin instead of vanishing.
  // TODO(Josh): wire this to send-pingram-email once a support-alert template exists in
  // Pingram, so the security team gets a real email/SMS instead of only a dashboard log.
  await logActivity({
    eventType: 'account_recovery_request_full',
    eventSource: 'send-account-recovery',
    severity: 'critical',
    metadata: {
      contactInfo,
      userRole,
      fullRecovery,
      requestType: 'Full account recovery (email + password forgotten)',
      timestamp: new Date().toISOString(),
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
