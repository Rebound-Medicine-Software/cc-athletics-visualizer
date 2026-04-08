import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import notificationapi from 'npm:notificationapi-node-server-sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const notificationsApiKey = Deno.env.get('NOTIFICATIONS_API_KEY')

notificationapi.init(
  'vb71ipi0lqnhmn54oedqyx2h9m',
  notificationsApiKey, {
    baseURL: 'https://api.eu.notificationapi.com'
  }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase admin client for generating confirmation links
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organisation, email, password } = await req.json();

    console.log('Sending organisation signup email to:', email);

    // Create confirmation URL that points to our custom edge function
    const confirmUrl = `${SUPABASE_URL}/functions/v1/confirm-organisation-account?email=${encodeURIComponent(email)}`;

    console.log('Sending organisation signup email to:', email, 'with confirmUrl:', confirmUrl);

    await notificationapi.send({
      type: 'create_organisation_account_email',
      to: {
        id: email,
        email: email
      },
      parameters: {
        organisation: organisation || 'Your Organisation',
        email,
        password,
        confirm_url: confirmUrl
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
  } catch (error: any) {
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