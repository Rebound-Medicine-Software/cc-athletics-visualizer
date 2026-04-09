import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Pingram } from 'npm:pingram'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

const respond = (ok: boolean, payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: jsonHeaders,
  })

const BodySchema = z.object({
  athleteId: z.string().uuid(),
  athleteEmail: z.string().email(),
  athleteName: z.string().min(1).max(255),
  organisationName: z.string().min(1).max(255),
  organisationLogo: z.string().default(''),
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
      return respond(false, {
        error: 'Invalid consent email payload',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }, 400)
    }

    const {
      athleteId,
      athleteEmail,
      athleteName,
      organisationName,
      organisationLogo,
      consentToken,
      loginPassword,
      siteUrl,
    } = parsed.data
    const consentUrl = `${siteUrl}/consent?token=${consentToken}`

    const apiKey = Deno.env.get('PINGRAM_API_KEY')
    if (!apiKey) {
      return respond(false, {
        error: 'PINGRAM_API_KEY is not configured.',
      })
    }

    const pingram = new Pingram({
      apiKey,
      baseUrl: 'https://api.pingram.io',
    })

    console.log('Sending consent email via Pingram to:', athleteEmail)

    try {
      const result = await pingram.send({
        type: 'email_compose_preview',
        to: {
          id: athleteEmail,
          email: athleteEmail,
        },
        parameters: {
          athlete_name: athleteName,
          organisation_name: organisationName,
          organisation_logo: organisationLogo,
          athlete_email: athleteEmail,
          login_password: loginPassword,
          consent_url: consentUrl,
        },
        templateId: 'send_consent_email',
      })

      console.log('Pingram send completed successfully:', JSON.stringify(result))
      return respond(true, {
        message: 'Consent email sent successfully.',
      })
    } catch (sendError: any) {
      const errorMessage = sendError?.message || 'Unknown Pingram error'
      console.error('Pingram send error:', errorMessage, sendError)
      return respond(false, {
        error: errorMessage,
      })
    }
  } catch (error: any) {
    console.error('Edge function error:', error)
    return respond(false, {
      error: error?.message || 'Unexpected edge function error',
    })
  }
})
