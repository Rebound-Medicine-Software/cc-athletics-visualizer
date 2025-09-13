import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase admin client for confirming users
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      throw new Error('Email parameter is required');
    }

    console.log('Confirming organisation account for:', email);

    // Find the user by email and confirm their account
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error fetching users:', getUserError);
      throw getUserError;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Confirm the user's email
    const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true
    });

    if (confirmError) {
      console.error('Error confirming user:', confirmError);
      throw confirmError;
    }

    console.log('Organisation account confirmed successfully for:', email);

    // Redirect to auth page with success message
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${SUPABASE_URL.replace('supabase.co', 'lovable.app')}/auth?confirmed=1`,
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error('Error confirming organisation account:', error);
    
    // Redirect to auth page with error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${SUPABASE_URL.replace('supabase.co', 'lovable.app')}/auth?error=confirmation_failed`,
        ...corsHeaders
      }
    });
  }
});