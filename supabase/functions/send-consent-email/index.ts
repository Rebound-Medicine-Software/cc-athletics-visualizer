import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'

const BodySchema = z.object({
  athleteId: z.string().uuid(),
  athleteEmail: z.string().email(),
  athleteName: z.string().min(1).max(255),
  organisationName: z.string().min(1).max(255),
  consentToken: z.string().uuid(),
  loginPassword: z.string().min(1),
  siteUrl: z.string().url(),
})

Deno.serve(async (req) => {
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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured')
    }

    const consentUrl = `${siteUrl}/consent?token=${consentToken}`
    const firstName = athleteName.split(' ')[0] || athleteName

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,hsl(214,100%,50%),hsl(214,100%,40%));padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Welcome to ${organisationName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Hello ${firstName},</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
                You have been added to the ${organisationName} performance analysis platform. Before you can access the system, 
                we need your consent to collect and use your performance data.
              </p>
              
              <div style="background-color:#f1f5f9;border-radius:8px;padding:20px;margin:0 0 24px;">
                <p style="color:#1e293b;font-weight:600;font-size:14px;margin:0 0 12px;">Your Login Credentials:</p>
                <p style="color:#475569;font-size:13px;margin:0 0 4px;">Email: <strong style="color:#1e293b;">${athleteEmail}</strong></p>
                <p style="color:#475569;font-size:13px;margin:0;">Password: <strong style="color:#1e293b;">${loginPassword}</strong></p>
                <p style="color:#94a3b8;font-size:11px;margin:8px 0 0;">These credentials will become active once you complete the consent form below.</p>
              </div>

              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Please click the button below to review and complete the data consent form. Your account will be activated once consent is confirmed.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${consentUrl}" style="display:inline-block;background:linear-gradient(135deg,hsl(214,100%,50%),hsl(214,100%,40%));color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                      Complete Consent Form
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;">
                If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${consentUrl}" style="color:hsl(214,100%,50%);word-break:break-all;">${consentUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                This email was sent by ${organisationName}. If you did not expect this email, please disregard it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${organisationName} <onboarding@resend.dev>`,
        to: [athleteEmail],
        subject: `Data Consent Required — ${organisationName}`,
        html: htmlContent,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
