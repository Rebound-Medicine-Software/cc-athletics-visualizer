import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientCredentials {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organisationName: string;
  athleteType?: string;
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
      firstName, 
      lastName, 
      password, 
      organisationName,
      athleteType 
    }: ClientCredentials = await req.json();

    console.log(`Creating client account for: ${email}`);

    // Create the user account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'client',
        athlete_type: athleteType
      }
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send credentials email using SendPulse API
    const emailData = {
      email: {
        from: {
          name: "Rebound Medicine & Performance",
          email: "noreply@reboundmedicine.com"
        },
        to: [{
          name: `${firstName} ${lastName}`,
          email: email
        }],
        subject: `Welcome to ${organisationName} - Your Athlete/Patient Account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">Welcome to ${organisationName}!</h2>
            
            <p>Hello ${firstName},</p>
            
            <p>Your athlete/patient account has been created. Here are your login credentials:</p>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
              ${athleteType ? `<p><strong>Type:</strong> ${athleteType}</p>` : ''}
            </div>
            
            <p>Please log in at: <a href="${req.headers.get('origin')}/auth">Access Athlete/Patient Portal</a></p>
            
            <p><strong>Important:</strong> Please change your password after your first login for security.</p>
            
            <p>You can now access your performance data, book appointments, and track your progress.</p>
            
            <p>If you have any questions, please contact your healthcare provider.</p>
            
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
        message: "Client account created and credentials sent",
        user: userData.user
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-client-credentials function:", error);
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