import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Pingram } from "npm:pingram";
import { getServiceRoleKey } from "../_shared/supabaseAdmin.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PingramRequest {
    templateId: string;
    to: {
      email: string;
      id?: string;
      number?: string;
      slackChannel?: string;
    };
    parameters?: Record<string, any>;
    type?: "email" | "email_compose_preview";
}

const respond = (ok: boolean, payload: Record<string, unknown>) =>
    new Response(JSON.stringify({ ok, ...payload }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
          return new Response(null, { headers: corsHeaders });
    }

        try {
              // Authenticate the user. This must confirm a real logged-in user made the
      // request, not just that some validly-signed Supabase JWT was sent - or,
      // as this function shipped, no check at all. The public anon key (already
      // public by design, see framework.md Section 5) satisfies a "some JWT was
      // sent" check with no login. This function sends a real email via NEXUS
      // Hub's Pingram account for any templateId/to.email the caller supplies,
      // so no auth check meant anyone with the anon key could use it as an open
      // spam/phishing-relay through the org's own verified sending domain - not
      // just a data read. auth.getUser() confirms the token is tied to a real
      // authenticated user, same fix already applied to vald-bridge (PR #42),
      // fetch-cc-data (PR #21), and cal-com-proxy (PR #70) for the same gap.
      const authHeader = req.headers.get("Authorization");
              if (!authHeader?.startsWith("Bearer ")) {
                      return new Response(JSON.stringify({ error: "Unauthorized" }), {
                                status: 401,
                                headers: { ...corsHeaders, "Content-Type": "application/json" },
                      });
              }

      const authClient = createClient(
              Deno.env.get("SUPABASE_URL")!,
              getServiceRoleKey(),
            );

      const { data: userData, error: authError } = await authClient.auth.getUser(
              authHeader.replace("Bearer ", "")
            );
              if (authError || !userData?.user) {
                      return new Response(JSON.stringify({ error: "Unauthorized" }), {
                                status: 401,
                                headers: { ...corsHeaders, "Content-Type": "application/json" },
                      });
              }

      const PINGRAM_API_KEY = Deno.env.get("PINGRAM_API_KEY");
              if (!PINGRAM_API_KEY) {
                      return respond(false, { error: "PINGRAM_API_KEY is not configured" });
              }

      const body: PingramRequest = await req.json();
              const { templateId, to, parameters = {}, type = "email" } = body;

      if (!templateId || !to?.email) {
              return respond(false, { error: "templateId and to.email are required" });
      }

      console.log(`[Pingram] Sending template '${templateId}' to ${to.email} (type: ${type})`);

      const pingram = new Pingram({ apiKey: PINGRAM_API_KEY });

      const result = await pingram.send({
              type,
              templateId,
              to: {
                        id: to.id ?? to.email,
                        email: to.email,
                        ...(to.number ? { number: to.number } : {}),
                        ...(to.slackChannel ? { slackChannel: to.slackChannel } : {}),
              },
              parameters,
      });

      console.log(`[Pingram] Sent successfully to ${to.email}`);
              return respond(true, { templateId, to: to.email, result: result ?? null });
        } catch (error: any) {
    const msg = error?.message ?? String(error);
              console.error("[Pingram] Error:", msg);
              return respond(false, { error: msg });
        }
});
