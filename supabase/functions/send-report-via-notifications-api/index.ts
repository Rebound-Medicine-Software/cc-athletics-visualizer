import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { athlete_id, pdf_path } = await req.json();
    
    if (!athlete_id || !pdf_path) {
      return new Response(
        JSON.stringify({ error: 'athlete_id and pdf_path are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending report for athlete_id: ${athlete_id}, pdf_path: ${pdf_path}`);

    // Fetch athlete data
    const { data: athlete, error: athleteError } = await supabaseClient
      .from('athletes_new')
      .select('*')
      .eq('id', athlete_id)
      .single();

    if (athleteError || !athlete) {
      console.error('Error fetching athlete:', athleteError);
      return new Response(
        JSON.stringify({ error: 'Athlete not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare report date in DD/MM/YYYY format
    const today = new Date();
    const report_date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    // Read PDF file content (simulated for now since we don't have actual file storage)
    const pdfContent = `Sample PDF content for athlete ${athlete.name}`;
    const pdfBase64 = btoa(pdfContent);

    // Prepare NotificationsAPI request payload
    const payload = {
      to: athlete.email,
      template: "athlete_report",
      variables: {
        athlete_name: athlete.name,
        team_name: athlete.team,
        report_date: report_date
      },
      attachments: [
        {
          filename: "report.pdf",
          content: pdfBase64,
          type: "application/pdf"
        }
      ]
    };

    console.log('Sending request to NotificationsAPI with payload:', JSON.stringify(payload, null, 2));

    // Check if API key exists
    const apiKey = Deno.env.get('NOTIFICATIONS_API_KEY');
    if (!apiKey) {
      console.error('NOTIFICATIONS_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Email service not configured - missing API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Making request to NotificationsAPI...');
    
    try {
      // Make POST request to NotificationsAPI with timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const notificationsResponse = await fetch('https://api.notificationsapi.com/messages/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('NotificationsAPI response status:', notificationsResponse.status);
      console.log('NotificationsAPI response headers:', Object.fromEntries(notificationsResponse.headers.entries()));

      let responseData;
      const contentType = notificationsResponse.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await notificationsResponse.json();
      } else {
        const textData = await notificationsResponse.text();
        console.log('Non-JSON response:', textData);
        responseData = { message: textData };
      }
      
      console.log('NotificationsAPI response data:', responseData);

      if (!notificationsResponse.ok) {
        console.error('NotificationsAPI error:', responseData);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send email via NotificationsAPI', 
            details: responseData,
            status: notificationsResponse.status 
          }),
          { status: notificationsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully',
          details: responseData 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('Network error when calling NotificationsAPI:', error);
      
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timeout - email service took too long to respond' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // DNS or network connectivity issues
      return new Response(
        JSON.stringify({ 
          error: 'Network connectivity issue when sending email', 
          details: error.message,
          suggestion: 'Please check if the email service is accessible or try again later'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-report-via-notifications-api function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});