import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClinicianCredentials {
  email: string;
  full_name: string;
  role_title?: string;
  qualifications?: string;
  password: string;
  team_name: string;
  team_id?: string;
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
      role_title, 
      qualifications, 
      password, 
      team_name,
      team_id 
    }: ClinicianCredentials = await req.json();

    console.log(`Creating clinician account for: ${email}`);

    // Create the user account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: 'practitioner', // Use consistent role naming
        role_title: role_title,
        qualifications: qualifications
      }
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // After user is created, we need to update the profile with team_id and organization relationship
    // The profile trigger will create the basic profile, but we need to set team_id and created_by
    if (userData.user) {
      // Get the organization profile that's creating this clinician
      const authHeader = req.headers.get('authorization');
      if (authHeader && team_id) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: requestingUser } } = await supabase.auth.getUser(token);
        
        if (requestingUser) {
          const { data: orgProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', requestingUser.id)
            .eq('role', 'organisation')
            .single();
            
          if (orgProfile) {
            // Update the newly created profile with the organization relationship and team_id
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                created_by: orgProfile.id,
                team_id: team_id
              })
              .eq('user_id', userData.user.id);
              
            if (updateError) {
              console.error('Error updating practitioner profile:', updateError);
            } else {
              console.log(`Assigned practitioner to team: ${team_id}`);
            }
          }
        }
      }
    }


    // Get SendPulse access token first
    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
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

    let emailSent = false;
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Prepare email content with your specified format
      const emailPayload = {
        email: {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; margin-bottom: 20px;">You've been invited as a practitioner to ${team_name} Force Platform software hub</h1>
              
              <p style="font-size: 16px; line-height: 1.5; color: #555;">
                Your login details are as follows:
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 10px 0;"><strong>Password:</strong> ${password}</p>
              </div>
              
              <p style="font-size: 16px; line-height: 1.5; color: #555;">
                Follow <a href="${req.headers.get('origin') || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/auth" style="color: #007bff; text-decoration: none;">this link</a> to be directed to your organisations hub to login and start testing your athletes/patients!
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #e8f4f8; border-radius: 8px;">
                <h3 style="color: #333; margin-top: 0;">Getting Started:</h3>
                <ol style="color: #555; line-height: 1.6;">
                  <li>Click the login link above</li>
                  <li>Select "Clinician" from the login options</li>
                  <li>Enter your email and password</li>
                  <li>Start managing and testing your athletes/patients</li>
                </ol>
              </div>
              
              <p style="font-size: 14px; color: #888; margin-top: 30px;">
                If you have any questions, please contact your organization administrator.
              </p>
            </div>
          `,
          text: `You've been invited as a practitioner to ${team_name} Force Platform software hub.

Your login details are as follows:

Email: ${email}
Password: ${password}

Follow this link to be directed to your organisations hub to login and start testing your athletes/patients: ${req.headers.get('origin') || Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/auth

Getting Started:
1. Click the login link above
2. Select "Clinician" from the login options  
3. Enter your email and password
4. Start managing and testing your athletes/patients

If you have any questions, please contact your organization administrator.`,
          subject: `You've been invited as a practitioner to ${team_name} Force Platform software hub`,
          from: {
            name: "Force Platform Hub",
            email: "noreply@forceplatformhub.com",
          },
          to: [
            {
              name: full_name,
              email: email,
            },
          ],
        },
      };

      // Send email via SendPulse SMTP
      const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(emailPayload),
      });

      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log("Email sent successfully:", emailResult);
        emailSent = true;
      } else {
        const errorText = await emailResponse.text();
        console.error("Failed to send email:", errorText);
      }
    } else {
      const errorText = await tokenResponse.text();
      console.error("Failed to get SendPulse token:", errorText);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Clinician account created and credentials sent",
        user: userData.user
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-clinician-credentials function:", error);
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