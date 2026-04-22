import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER_NAME = "NEXUS HUB";
const SENDER_EMAIL = "noreply@pingram.io";

interface PingramRequest {
  templateName: string;
  to: string;
  data?: Record<string, any>;
  subject?: string;
}

// Brand-styled wrapper
const wrap = (title: string, bodyHtml: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1e3a6e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(30,58,110,0.08);">
        <tr><td style="background:#1e3a6e;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#d4af37;font-size:24px;letter-spacing:2px;">NEXUS HUB</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#f4f6fa;padding:16px 32px;text-align:center;font-size:12px;color:#6b7280;">
          © ${new Date().getFullYear()} NEXUS HUB. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

// Template registry
const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  "practitioner-credentials": (d) => ({
    subject: `Welcome to ${d.organisation || "NEXUS HUB"} – Your Login Credentials`,
    html: wrap("Practitioner Credentials", `
      <h2 style="color:#1e3a6e;margin-top:0;">Welcome, ${d.fullName || "Practitioner"}!</h2>
      <p>You have been added to <strong>${d.organisation || "NEXUS HUB"}</strong> as a <strong>${d.role || "Practitioner"}</strong>.</p>
      <p>Your login details:</p>
      <table cellpadding="8" style="background:#f4f6fa;border-radius:8px;width:100%;margin:16px 0;">
        <tr><td><strong>Email:</strong></td><td>${d.email}</td></tr>
        <tr><td><strong>Password:</strong></td><td><code>${d.password}</code></td></tr>
      </table>
      <p style="text-align:center;margin:24px 0;">
        <a href="${d.loginUrl || "#"}" style="background:#d4af37;color:#1e3a6e;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Login to NEXUS HUB</a>
      </p>
      <p style="font-size:12px;color:#6b7280;">For security, please change your password after your first login.</p>
    `),
  }),
  "verification-code": (d) => ({
    subject: "Your NEXUS HUB Verification Code",
    html: wrap("Verification Code", `
      <h2 style="color:#1e3a6e;margin-top:0;">Verification Code</h2>
      <p>Use the code below to verify your account:</p>
      <p style="text-align:center;font-size:32px;letter-spacing:8px;color:#d4af37;font-weight:bold;background:#f4f6fa;padding:20px;border-radius:8px;">${d.code}</p>
      <p style="font-size:12px;color:#6b7280;">This code expires in 10 minutes.</p>
    `),
  }),
  "test-email": (d) => ({
    subject: "NEXUS HUB Test Email",
    html: wrap("Test", `
      <h2 style="color:#1e3a6e;margin-top:0;">Test Email</h2>
      <p>${d.message || "This is a test email from NEXUS HUB via Pingram."}</p>
    `),
  }),
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINGRAM_API_KEY = Deno.env.get("PINGRAM_API_KEY");
    if (!PINGRAM_API_KEY) {
      throw new Error("PINGRAM_API_KEY is not configured");
    }

    const { templateName, to, data = {}, subject: subjectOverride }: PingramRequest = await req.json();

    if (!templateName || !to) {
      return new Response(
        JSON.stringify({ error: "templateName and to are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = TEMPLATES[templateName];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${templateName}. Available: ${Object.keys(TEMPLATES).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = template(data);

    console.log(`[Pingram] Sending '${templateName}' to ${to}`);

    const pingramRes = await fetch("https://api.pingram.io/v1/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "email",
        to: { email: to },
        email: {
          subject: subjectOverride || subject,
          html,
          senderName: SENDER_NAME,
          senderEmail: SENDER_EMAIL,
        },
      }),
    });

    const responseText = await pingramRes.text();
    console.log(`[Pingram] Status: ${pingramRes.status}, Body: ${responseText.slice(0, 300)}`);

    if (!pingramRes.ok) {
      return new Response(
        JSON.stringify({ error: `Pingram API failed [${pingramRes.status}]: ${responseText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, templateName, to }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Pingram] Error:", error?.message ?? String(error));
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
