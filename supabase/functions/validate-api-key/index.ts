
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Validating API key...');

    // Make request to CC Athletics API
    const response = await fetch('https://europe-west1-forcemate-desktop.cloudfunctions.net/get_teams', {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('CC Athletics API response status:', response.status);

    if (response.status === 401) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid API key. Please check your credentials.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (response.status === 500) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Server error. Please try again later.' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `API request failed with status ${response.status}` 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const isValid = data.teams && data.teams.length > 0;

    console.log('API key validation result:', isValid);

    return new Response(
      JSON.stringify({ 
        valid: isValid,
        teamsCount: data.teams ? data.teams.length : 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('API validation error:', error);
    
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Network error. Unable to validate API key.' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
