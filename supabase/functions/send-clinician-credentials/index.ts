import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@4.0.0";

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


    // Initialize Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    console.log("Sending email via Resend...");
    
    let emailSent = false;
    try {
      const loginUrl = `${req.headers.get('origin') || 'https://bvieqoevqkwdkphubabt.supabase.co'}/auth`;
      
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: "Force Platform Hub <noreply@forceplatformhub.com>",
        to: [email],
        subject: `Welcome to ${team_name} - Your Login Details`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
              Welcome to ${team_name}
            </h1>
            
            <p style="font-size: 16px; color: #555;">
              Hello ${full_name},
            </p>
            
            <p style="font-size: 16px; color: #555;">
              Your practitioner account has been created for ${team_name}. Here are your login details:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
              ${role_title ? `<p style="margin: 5px 0;"><strong>Role:</strong> ${role_title}</p>` : ''}
            </div>
            
            <p style="font-size: 16px; color: #555;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; margin: 10px 0;">
                Login to Your Account
              </a>
            </p>
            
            <p style="font-size: 14px; color: #777; margin-top: 30px;">
              Please change your password after your first login for security purposes.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999;">
              If you have any questions, please contact your team administrator.
            </p>
          </div>
        `,
      });

      if (emailError) {
        console.error("Resend email error:", emailError);
        return new Response(
          JSON.stringify({ 
            error: `Failed to send email: ${emailError.message}`,
            details: emailError
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Email sent successfully via Resend:", emailResult);
      emailSent = true;
      
    } catch (error: any) {
      console.error("Error sending email:", error);
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