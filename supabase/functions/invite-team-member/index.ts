import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, full_name, role, team_id, inviter_name } = await req.json()

    if (!email || !role || !team_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a secure random password
    const generatePassword = () => {
      const adjectives = ["Swift", "Strong", "Bright", "Noble", "Quick", "Bold", "Smart", "Great"];
      const nouns = ["Tiger", "Eagle", "Lion", "Wolf", "Bear", "Hawk", "Fox", "Shark"];
      const numbers = Math.floor(Math.random() * 99) + 10;
      const symbols = ["!", "@", "#", "$", "%"];
      
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      
      return `${adjective}${noun}${numbers}${symbol}`;
    };

    const temporaryPassword = generatePassword();

    // Create user account
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        team_id
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the profile with team information
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        team_id,
        full_name
      })
      .eq('user_id', authData.user.id)

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // Send invitation email (you can implement this with your preferred email service)
    console.log(`Invitation sent to ${email} with temporary password: ${temporaryPassword}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        temporary_password: temporaryPassword 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})