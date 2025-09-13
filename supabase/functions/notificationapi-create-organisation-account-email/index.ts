import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import notificationapi from 'npm:notificationapi-node-server-sdk';

notificationapi.init(
  'n3g0q177rbzrr6riq8re90n1yc',
  'imcbx9veiw5sc3cx48du58gnlyopxbu88p46legnkfik7ksoigxz70i1sa',{
    baseURL: 'https://api.eu.notificationapi.com'
  }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organisation, email, password } = await req.json();

    console.log('Sending organisation signup email to:', email);

    await notificationapi.send({
      type: 'create_organisation_account_email',
      to: {
        id: email,
        email: email
      },
      parameters: {
        "organisation": organisation || "Your Organisation",
        "email": email,
        "password": password
      },
      templateId: 'create_organisation_account_email'
    });

    console.log('Organisation signup email sent successfully');
    
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error sending organisation signup email:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});