import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { contactInfo, userRole }: EmailRecoveryRequest = await req.json();

    console.log(`Processing email recovery request for ${userRole}: ${contactInfo}`);

    // Get SendPulse access token
    const authResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: Deno.env.get("SENDPULSE_API_USER_ID"),
        client_secret: Deno.env.get("SENDPULSE_API_SECRET"),
      }),
    });

    const authData = await authResponse.json();
    
    if (!authResponse.ok) {
      console.error("SendPulse auth error:", authData);
      throw new Error("Failed to authenticate with SendPulse");
    }

    // Send email using SendPulse
    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        email: {
          subject: `Email Recovery Request - ${userRole}`,
          from: {
            name: "Rebound Support",
            email: "support@reboundmedicine.co"
          },
          to: [
            {
              name: "Support Team",
              email: "support@reboundmedicine.co"
            }
          ],
          html: `
            <h2>Email Recovery Request</h2>
            <p><strong>User Role:</strong> ${userRole}</p>
            <p><strong>Contact Information Provided:</strong> ${contactInfo}</p>
            <p><strong>Request Type:</strong> Email recovery only</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            
            <h3>Action Required:</h3>
            <p>Please verify the user's identity using the provided contact information and assist with email recovery.</p>
            
            <p><strong>Security Note:</strong> This is a HIPAA-compliant medical platform. Verify identity thoroughly before providing any account information.</p>
          `
        }
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Error sending support email:", emailData);
      return new Response(
        JSON.stringify({ error: "Failed to submit recovery request" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log the recovery request (optional - for audit trail)
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