import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Pingram } from "npm:pingram";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  email: string;
}

const respond = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINGRAM_API_KEY = Deno.env.get("PINGRAM_API_KEY");
    if (!PINGRAM_API_KEY) {
      return respond(500, { error: "PINGRAM_API_KEY is not configured" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { email }: ResetRequest = await req.json();
    if (!email) {
      return respond(400, { error: "Email is required" });
    }

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer") ||
      "https://nexushub.app";

    console.log(`[PasswordReset] Generating recovery link for: ${email}`);

    // Look up the user's full name (best-effort)
    let fullName = "there";
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("email", email)
        .maybeSingle();
      if (profile?.full_name) fullName = profile.full_name;
    } catch (e) {
      console.warn("[PasswordReset] Could not fetch profile name:", e);
    }

    // Generate the recovery link via Supabase Admin API (does NOT send Supabase email)
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${origin}/admin?type=recovery`,
        },
      });

    if (linkError) {
      console.error("[PasswordReset] generateLink error:", linkError);
      return respond(400, { error: linkError.message });
    }

    const recoveryUrl = linkData?.properties?.action_link;
    if (!recoveryUrl) {
      return respond(500, { error: "Failed to generate recovery link" });
    }

    console.log(`[PasswordReset] Sending Pingram email to: ${email}`);

    const pingram = new Pingram({ apiKey: PINGRAM_API_KEY });

    // Adapt the sign_up_organisation_account template with password-reset content.
    // Template merge tags can reference any of these parameter keys.
    const result = await pingram.send({
      type: "email",
      templateId: "sign_up_organisation_account",
      to: {
        id: email,
        email,
      },
      parameters: {
        organisation_name: "NEXUS HUB Software",
        sender_name: "NEXUS HUB Software",
        full_name: fullName,
        recipient_name: fullName,
        email_subject: "Reset your NEXUS HUB password",
        email_heading: "Password reset request",
        email_intro:
          "We received a request to reset the password for your NEXUS HUB account. Click the button below to choose a new password. This link will expire in 1 hour.",
        email_body:
          "If you didn't request this, you can safely ignore this email — your password will remain unchanged.",
        cta_label: "Reset Password",
        cta_url: recoveryUrl,
        action_url: recoveryUrl,
        recovery_url: recoveryUrl,
        login_url: recoveryUrl,
        confirmation_url: recoveryUrl,
        support_email: "support@nexushub.app",
        year: new Date().getFullYear().toString(),
      },
    });

    console.log(`[PasswordReset] Pingram send completed for ${email}`);

    return respond(200, {
      success: true,
      message: "Password reset email sent",
      result: result ?? null,
    });
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    console.error("[PasswordReset] Error:", msg);
    return respond(500, { error: msg });
  }
});
