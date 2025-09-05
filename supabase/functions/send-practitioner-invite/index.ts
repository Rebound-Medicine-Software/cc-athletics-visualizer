import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PractitionerInviteRequest {
  email: string;
  full_name: string;
  password: string;
  role_title?: string;
  team_name: string;
  login_url?: string;
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

    const { 
      email, 
      full_name, 
      password, 
      role_title, 
      team_name,
      login_url = "https://your-app.com/auth"
    }: PractitionerInviteRequest = await req.json();

    console.log(`Sending practitioner invite to: ${email}`);

    // Get SendPulse credentials
    const sendPulseUserId = Deno.env.get("SENDPULSE_API_USER_ID");
    const sendPulseSecret = Deno.env.get("SENDPULSE_API_SECRET");

    if (!sendPulseUserId || !sendPulseSecret) {
      throw new Error("SendPulse API credentials not configured");
    }

    // Get SendPulse access token
    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: sendPulseUserId,
        client_secret: sendPulseSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("SendPulse token error:", errorText);
      throw new Error(`Failed to get SendPulse token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Send email using SendPulse template
    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: {
          from: {
            name: team_name || "Your Organization",
            email: "noreply@yourdomain.com", // Replace with your verified sending domain
          },
          to: [
            {
              name: full_name,
              email: email,
            },
          ],
          subject: `Welcome to ${team_name} - Your Account is Ready`,
          template: {
            id: "send_email_to_practitioners", // Your specified template ID
            variables: {
              practitioner_name: full_name,
              practitioner_email: email,
              practitioner_password: password,
              role_title: role_title || "Practitioner",
              team_name: team_name,
              login_url: login_url,
              portal_instructions: "Please log in using the credentials below and change your password on first login.",
            },
          },
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("SendPulse email error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Practitioner invite sent successfully",
        email_id: emailResult.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-practitioner-invite function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to send practitioner invite email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);