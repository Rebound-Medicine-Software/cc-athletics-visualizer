import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClinicianCredentials {
  email: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  qualifications?: string;
  password?: string;
  organisationName?: string;
  organization_name?: string;
  avatar_url?: string;
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
      firstName, 
      lastName, 
      role, 
      qualifications, 
      password,
      organisationName,
      organization_name,
      avatar_url,
      team_id
    }: ClinicianCredentials = await req.json();

    // Handle both naming conventions
    const orgName = organisationName || organization_name || 'Your Organization';
    const actualPassword = password || `temp${Math.random().toString(36).slice(-8)}`;
    const firstName_ = firstName || full_name?.split(' ')[0] || 'User';
    const lastName_ = lastName || full_name?.split(' ').slice(1).join(' ') || '';

    console.log(`Creating clinician account for: ${email}`);

    // Create the user account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: actualPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || `${firstName_} ${lastName_}`,
        first_name: firstName_,
        last_name: lastName_,
        role: 'practitioner', // Use consistent role naming
        qualifications,
        avatar_url
      }
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // After user is created, we need to update the profile with organization relationship
    if (userData.user) {
      // If team_id is provided directly, use it
      if (team_id) {
        await supabase
          .from('profiles')
          .update({ 
            team_id,
            role: 'practitioner',
            full_name: full_name || `${firstName_} ${lastName_}`,
            avatar_url
          })
          .eq('user_id', userData.user.id);
      } else {
        // Get the organization profile that's creating this clinician
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user: requestingUser } } = await supabase.auth.getUser(token);
          
          if (requestingUser) {
            const { data: orgProfile } = await supabase
              .from('profiles')
              .select('id, team_id')
              .eq('user_id', requestingUser.id)
              .eq('role', 'organisation')
              .single();
              
            if (orgProfile) {
              // Update the newly created profile with the organization relationship
              await supabase
                .from('profiles')
                .update({ 
                  created_by: orgProfile.id,
                  team_id: orgProfile.team_id,
                  role: 'practitioner',
                  full_name: full_name || `${firstName_} ${lastName_}`,
                  avatar_url
                })
                .eq('user_id', userData.user.id);
            }
          }
        }
      }
    }


    // Send credentials email using SendPulse API
    const emailData = {
      email: {
        from: {
          name: "Rebound Medicine & Performance",
          email: "noreply@reboundmedicine.com"
        },
        to: [{
          name: full_name || `${firstName_} ${lastName_}`,
          email: email
        }],
        subject: `Welcome to ${orgName} - Your Clinician Account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3B82F6;">Welcome to ${orgName}!</h2>
            
            <p>Hello ${firstName_},</p>
            
            <p>Your clinician account has been created. Here are your login credentials:</p>
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${actualPassword}</p>
              <p><strong>Role:</strong> ${role}</p>
              ${qualifications ? `<p><strong>Qualifications:</strong> ${qualifications}</p>` : ''}
            </div>
            
            <p>Please log in at: <a href="${req.headers.get('origin')}/auth">Access Clinician Portal</a></p>
            
            <p><strong>Important:</strong> Please change your password after your first login for security.</p>
            
            <p>If you have any questions, please contact your organisation administrator.</p>
            
            <p>Best regards,<br>Rebound Medicine & Performance Team</p>
          </div>
        `
      }
    };

    // Send email via SendPulse
    const sendPulseResponse = await fetch('https://api.sendpulse.com/addressbooks/1/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SENDPULSE_API_SECRET")}`
      },
      body: JSON.stringify(emailData)
    });

    if (!sendPulseResponse.ok) {
      console.error('SendPulse API error:', await sendPulseResponse.text());
      // Don't fail the entire request if email fails
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