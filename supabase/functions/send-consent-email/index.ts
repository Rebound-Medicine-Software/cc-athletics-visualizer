import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import notificationapi from 'npm:notificationapi-node-server-sdk@1.1.0'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  athleteId: z.string().uuid(),
  athleteEmail: z.string().email(),
  athleteName: z.string().min(1).max(255),
  organisationName: z.string().min(1).max(255),
  consentToken: z.string().uuid(),
  loginPassword: z.string().min(1),
  siteUrl: z.string().url(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { athleteEmail, athleteName, organisationName, consentToken, loginPassword, siteUrl } = parsed.data
    const consentUrl = `${siteUrl}/consent?token=${consentToken}`

    // Initialize NotificationAPI
    notificationapi.init(
      'n3g0q177rbzrr6riq8re90n1yc',
      'imcbx9veiw5sc3cx48du58gnlyopxbu88p46legnkfik7ksoigxz70i1sa',
      {
        baseURL: 'https://api.eu.notificationapi.com'
      }
    )

    console.log('Sending consent email via NotificationAPI to:', athleteEmail)

    const notificationResponse = await notificationapi.send({
      type: 'send_consent_email',
      to: {
        id: athleteEmail,
        email: athleteEmail,
      },
      parameters: {
        athlete_name: athleteName,
        organisation_name: organisationName,
        athlete_email: athleteEmail,
        login_password: loginPassword,
        consent_url: consentUrl,
      },
      templateId: 'send_consent_email',
    })

    console.log('NotificationAPI response:', JSON.stringify(notificationResponse, null, 2))

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
