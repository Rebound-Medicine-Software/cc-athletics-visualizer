import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase admin client for creating users
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') as string;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, firstName, lastName } = await req.json();

    console.log('Creating organisation account for:', email);

    // Check if organization account already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('role', 'organisation')
      .maybeSingle();

    if (existingProfile) {
      console.log('Organization account already exists for:', email);
      return new Response(JSON.stringify({
        error: 'An organization account with this email already exists. Please contact support if you need to recover access.'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Create user with admin API (bypasses email confirmation)
    const { data: user, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Keep unconfirmed until they click the button
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'organisation'
      }
    });

    if (signUpError) {
      console.error('Error creating user:', signUpError);
      return new Response(JSON.stringify({
        error: signUpError.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    console.log('User created successfully:', user.user?.id);

    // Send NotificationAPI email
    console.log('Sending NotificationAPI email...');
    const { error: emailError } = await supabase.functions.invoke('notificationapi-create-organisation-account-email', {
      body: {
        organisation: `${firstName} ${lastName}`,
        email,
        password
      }
    });

    if (emailError) {
      console.error('Error sending notification email:', emailError);
      // Don't fail the signup if email fails
    } else {
      console.log('NotificationAPI email sent successfully');
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Account created successfully! Please check your email for confirmation instructions.'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error('Error in signup-organisation function:', error);
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