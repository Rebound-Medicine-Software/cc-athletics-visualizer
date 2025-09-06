import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import notificationapi from 'npm:notificationapi-node-server-sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PractitionerInviteRequest {
  email: string;
  full_name: string;
  password: string;
  role_title?: string;
  team_name: string;
  login_url?: string;
}

notificationapi.init(
  'n3g0q177rbzrr6riq8re90n1yc',
  'imcbx9veiw5sc3cx48du58gnlyopxbu88p46legnkfik7ksoigxz70i1sa',
  {
    baseURL: 'https://api.eu.notificationapi.com'
  }
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      full_name, 
      password, 
      role_title, 
      team_name,
      login_url 
    }: PractitionerInviteRequest = await req.json();

    console.log(`Sending practitioner invite to: ${email}`);

    const parameters = {
      "Practitioner": full_name,
      "Organisation": team_name,
      "Email": email,
      "Password": password
    };

    await notificationapi.send({
      type: 'send_email_to_practitioners',
      to: {
        id: email,
        email: email
      },
      parameters: parameters,
      email: {
        subject: 'Your Account Credentials',
        html: 'Your account has been created.'
      }
    });

    console.log('Practitioner invite sent successfully');
    
    return new Response(JSON.stringify({
      success: true,
      message: "Practitioner invite sent successfully"
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in send-practitioner-invite function:", error);
    return new Response(JSON.stringify({ 
      error: "Unexpected error: " + error.message
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
});