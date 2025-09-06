import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import notificationapi from "https://esm.sh/notificationapi-node-server-sdk@latest";

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
    console.log('Practitioner invite function started...');
    
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

    // Initialize and send email via NotificationAPI
    console.log('Initializing NotificationAPI...');
    try {
      notificationapi.init(
        'n3g0q177rbzrr6riq8re90n1yc',
        'imcbx9veiw5sc3cx48du58gnlyopxbu88p46legnkfik7ksoigxz70i1sa',
        {
          baseURL: 'https://api.eu.notificationapi.com'
        }
      );

      console.log('Sending email via NotificationAPI...');
      console.log('Email parameters:', {
        type: 'send_email_to_practitioners',
        to: { id: email, email: email },
        parameters: {
          "Practitioner": full_name,
          "Team": team_name,
          "Email": email,
          "Password": password,
          "Role": role_title || "Practitioner",
          "LoginURL": login_url
        }
      });

      const notificationResponse = await notificationapi.send({
        type: 'send_email_to_practitioners',
        to: {
          id: email,
          email: email
        },
        parameters: {
          "Practitioner": full_name,
          "Team": team_name,
          "Email": email,
          "Password": password,
          "Role": role_title || "Practitioner",
          "LoginURL": login_url
        }
      });

      console.log('NotificationAPI response:', JSON.stringify(notificationResponse, null, 2));
      
      if (notificationResponse && notificationResponse.data) {
        console.log('Practitioner invite sent successfully via NotificationAPI');
      } else {
        console.warn('NotificationAPI response was empty or undefined');
      }
    } catch (emailError: any) {
      console.error('NotificationAPI error:', emailError);
      console.error('NotificationAPI error details:', emailError.message);
      if (emailError.stack) {
        console.error('NotificationAPI error stack:', emailError.stack);
      }
      // Don't fail the entire request if email fails - just log and continue
    }

    console.log('Practitioner invite function completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Practitioner invite sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-practitioner-invite function:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error: " + error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);