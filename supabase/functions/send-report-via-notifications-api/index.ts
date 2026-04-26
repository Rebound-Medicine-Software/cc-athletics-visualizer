import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NOTIFICATION_API_BASE = 'https://api.eu.notificationapi.com'
const CLIENT_ID = 'n3g0q177rbzrr6riq8re90n1yc'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { athlete_id, pdf_path } = await req.json()

    if (!athlete_id || !pdf_path) {
      return new Response(
        JSON.stringify({ error: 'athlete_id and pdf_path are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending report for athlete_id: ${athlete_id}, pdf_path: ${pdf_path}`)

    // Fetch athlete from canonical `athletes` table, joining team name from `teams`.
    const { data: athleteRow, error: athleteError } = await supabaseClient
      .from('athletes')
      .select('id, name, email, last_test_at, teams ( name )')
      .eq('id', athlete_id)
      .maybeSingle()

    if (athleteError || !athleteRow) {
      console.error('Error fetching athlete:', athleteError)
      return new Response(
        JSON.stringify({ error: 'Athlete not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const athlete = {
      id: athleteRow.id as string,
      name: (athleteRow.name as string) ?? '',
      email: (athleteRow.email as string) ?? null,
      team: ((athleteRow as any).teams?.name as string) ?? '',
      testing_dates: athleteRow.last_test_at
        ? new Date(athleteRow.last_test_at as string).toISOString().split('T')[0]
        : '',
    }

    const today = new Date()
    const report_date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`

    const recipientEmail = athlete.email
    console.log('Recipient email resolved to:', recipientEmail || '(none)')

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Athlete has no email address on file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notificationsApiKey = Deno.env.get('NOTIFICATIONS_API_KEY')
    if (!notificationsApiKey) {
      console.error('NotificationAPI key missing')
      return new Response(
        JSON.stringify({ error: 'Email service not configured - missing NOTIFICATIONS_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sending report via NotificationAPI REST...')

    // NotificationAPI REST endpoint: POST /{clientId}/sender
    // Auth: HTTP Basic (client_id:api_key) base64
    const authToken = btoa(`${CLIENT_ID}:${notificationsApiKey}`)

    const payload = {
      notificationId: 'athlete_report_email',
      user: {
        id: athlete.id,
        email: recipientEmail,
      },
      mergeTags: {
        athlete: athlete.name,
        report_date,
        team: athlete.team,
        testing_dates: athlete.testing_dates,
        'organisation-image': 'https://assets.notificationapi.com/placeholder-logo.png',
        'interactive-pdf-insterted-here': `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${pdf_path}" target="_blank" style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              📊 View Your Interactive Performance Report
            </a>
            <p style="margin-top: 10px; color: #6b7280; font-size: 14px;">
              Click the button above to view your comprehensive performance analysis.
            </p>
          </div>
        `,
      },
    }

    const apiResponse = await fetch(`${NOTIFICATION_API_BASE}/${CLIENT_ID}/sender`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!apiResponse.ok) {
      const text = await apiResponse.text().catch(() => '')
      console.error(`NotificationAPI failed [${apiResponse.status}]:`, text)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email via NotificationAPI',
          status: apiResponse.status,
          details: text,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Report sent successfully via NotificationAPI')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report sent successfully via NotificationAPI',
        email: recipientEmail,
        athlete_name: athlete.name,
        team_name: athlete.team,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-report-via-notifications-api function:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
