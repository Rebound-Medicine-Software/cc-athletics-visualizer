import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import notificationapi, { Channels } from 'npm:notificationapi-node-server-sdk@1.1.0'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const notificationsApiKey = Deno.env.get('NOTIFICATIONS_API_KEY')
const notificationsDomainKey = Deno.env.get('NOTIFICATIONS_API_DOMAIN_KEY')

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
}

const respond = (ok: boolean, payload: Record<string, unknown>) =>
  new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: jsonHeaders,
  })

const extractMessages = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') return []

  const maybeMessages = (payload as { messages?: unknown }).messages
  return Array.isArray(maybeMessages)
    ? maybeMessages.filter((message): message is string => typeof message === 'string')
    : []
}

const hasFatalWarning = (messages: string[]) =>
  messages.some((message) =>
    /all delivery channels are disabled|no default email template set|template with id/i.test(message)
  )

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
      })
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

    if (!notificationsApiKey || !notificationsDomainKey) {
      return respond(false, {
        error: 'Pingram is not configured correctly for this function.',
      })
    }

    notificationapi.init('vb71ipi0lqnhmn54oedqyx2h9m', notificationsApiKey, {
      baseURL: 'https://api.eu.notificationapi.com',
      domainKey: notificationsDomainKey,
    })

    console.log('Sending consent email via NotificationAPI to:', athleteEmail)

    try {
      const notificationResponse = await notificationapi.send({
        notificationId: 'send_consent_email',
        templateId: 'send_consent_email',
        forceChannels: [Channels.EMAIL],
        user: {
          id: athleteId,
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
      })

      const messages = extractMessages(notificationResponse?.data)
      const trackingId =
        notificationResponse?.data && typeof notificationResponse.data === 'object'
          ? (notificationResponse.data as { trackingId?: unknown }).trackingId
          : undefined

      if (messages.length > 0) {
        console.warn('NotificationAPI returned warnings:', messages)
      }

      if (hasFatalWarning(messages)) {
        return respond(false, {
          error: 'Pingram accepted the request but did not send an email.',
          details: messages,
          trackingId,
        })
      }

      console.log('NotificationAPI send completed successfully')
      return respond(true, {
        message: 'Consent email sent successfully.',
        trackingId,
        warnings: messages,
      })
    } catch (notifError: any) {
      const details = extractMessages(notifError?.response?.data)
      const errorMessage =
        notifError?.response?.data?.message || notifError?.message || 'Unknown NotificationAPI error'

      console.error('NotificationAPI error:', errorMessage)
      return respond(false, {
        error: errorMessage,
        details,
      })
    }
  } catch (error: any) {
    console.error('Edge function error:', error)
    return respond(false, {
      error: error?.message || 'Unexpected edge function error',
    })
  }
})
