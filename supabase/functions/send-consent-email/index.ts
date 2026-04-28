import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { z } from 'https://esm.sh/zod@3.23.8'
import { logActivity, logIntegrationHealth } from '../_shared/logActivity.ts'

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

const NOTIFICATION_API_BASE = 'https://api.eu.notificationapi.com'
const CLIENT_ID = 'n3g0q177rbzrr6riq8re90n1yc'

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

    const apiKey = Deno.env.get('NOTIFICATIONS_API_KEY')
    if (!apiKey) {
      console.error('NOTIFICATIONS_API_KEY missing')
      return respond(false, { error: 'Email service not configured' }, 500)
    }

    console.log('Sending consent email via NotificationAPI REST to:', athleteEmail)

    const authToken = btoa(`${CLIENT_ID}:${apiKey}`)
    const payload = {
      notificationId: 'send_consent_email',
      user: {
        id: athleteEmail,
        email: athleteEmail,
      },
      mergeTags: {
        athlete_name: athleteName,
        organisation_name: organisationName,
        organisation_logo: organisationLogo,
        athlete_email: athleteEmail,
        login_password: loginPassword,
        consent_url: consentUrl,
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
      await logIntegrationHealth('notificationapi', 'failed', {
        failureReason: `consent email ${apiResponse.status}: ${text.slice(0, 500)}`,
        payload: { notificationId: 'send_consent_email', email: athleteEmail },
      })
      await logActivity({
        eventType: 'consent_email_failed',
        eventSource: 'send-consent-email',
        severity: 'critical',
        athleteId,
        organisationName,
        metadata: { email: athleteEmail, status: apiResponse.status },
      })
      return respond(false, {
        error: 'Failed to send consent email',
        status: apiResponse.status,
        details: text,
      }, 500)
    }

    console.log('Consent email sent successfully via NotificationAPI')
    await logIntegrationHealth('notificationapi', 'success', {
      payload: { notificationId: 'send_consent_email' },
    })
    await logActivity({
      eventType: 'consent_email_sent',
      eventSource: 'send-consent-email',
      severity: 'info',
      athleteId,
      organisationName,
      metadata: { athleteName, email: athleteEmail },
    })
    return respond(true, { message: 'Consent email sent successfully.' })
  } catch (error: any) {
    console.error('Edge function error:', error)
    return respond(false, {
      error: error?.message || 'Unexpected edge function error',
    }, 500)
  }
})
