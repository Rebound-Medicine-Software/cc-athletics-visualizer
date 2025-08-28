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


    // Get SendPulse API credentials
    const sendpulseUserId = Deno.env.get("SENDPULSE_API_USER_ID");
    const sendpulseSecret = Deno.env.get("SENDPULSE_API_SECRET");
    
    if (!sendpulseUserId || !sendpulseSecret) {
      console.error("SendPulse credentials are not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending email via SendPulse...");
    
    let emailSent = false;
    try {
      // Get SendPulse access token
      const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: sendpulseUserId,
          client_secret: sendpulseSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("SendPulse token error:", error);
        throw new Error(`Failed to get SendPulse token: ${tokenResponse.status} ${error}`);
      }

      const tokenData = await tokenResponse.json();
      console.log("SendPulse token obtained successfully");

      const loginUrl = `${req.headers.get('origin') || 'https://bvieqoevqkwdkphubabt.supabase.co'}/auth`;

      // Send email using SendPulse template
      const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: {
            template: {
              id: 40697,
              variables: {
                name: full_name,
                team_name: team_name,
                email: email,
                password: password,
                role_title: role_title || '',
                login_url: loginUrl
              }
            },
            from: {
              name: "Force Platform Hub",
              email: "reflexsportstherapyy@gmail.com"
            },
            to: [
              {
                name: full_name,
                email: email
              }
            ],
            subject: `Welcome to ${team_name} - Your Login Details`
          }
        }),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error("SendPulse email error:", error);
        throw new Error(`Failed to send email: ${emailResponse.status} ${error}`);
      }

      const emailResult = await emailResponse.json();
      console.log("Email sent successfully via SendPulse:", emailResult);
      emailSent = true;
      
    } catch (error: any) {
      console.error("Error sending email via SendPulse:", error);
      return new Response(
        JSON.stringify({ 
          error: `Failed to send email: ${error.message}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: emailSent ? "Clinician account created and credentials sent" : "Clinician account created but email failed to send",
        user: userData.user,
        emailSent: emailSent
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