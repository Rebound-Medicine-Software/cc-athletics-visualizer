
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

    console.log('Sending welcome email to:', email);

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
          subject: "Confirm Your Email Address",
          from: {
            name: "Rebound Medicine & Performance",
            email: "reflexsportstherapyy@gmail.com"
          },
          to: [
            {
              name: `${firstName} ${lastName}`,
              email: email
            }
          ],
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e40af; margin-bottom: 20px;">Hello ${firstName}!</h1>
              
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Welcome to Rebound Performance and Medicine's Advanced Force Plate Hub. 
                Please can you confirm your email address 
                <strong style="color: #1e40af;">${email}</strong> 
                and follow the landing page to log into our hub with your new account!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://your-app-url.com'}/auth" 
                   style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Return to Login
                </a>
              </div>
              
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Best Wishes,</p>
              
              <div style="border-top: 2px solid #1e40af; padding-top: 20px; text-align: center;">
                <img src="${Deno.env.get('SITE_URL') || 'https://your-app-url.com'}/lovable-uploads/2e29878b-d40d-47c5-a72c-da08ce28173d.png" 
                     alt="Rebound Medicine and Performance" 
                     style="max-width: 150px; height: auto; margin-bottom: 10px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Rebound Medicine & Performance<br>
                  Advanced Force Plate Analysis Platform
                </p>
              </div>
            </div>
          `
        }
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Error sending welcome email:", emailData);
      throw new Error("Failed to send welcome email");
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.result?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
