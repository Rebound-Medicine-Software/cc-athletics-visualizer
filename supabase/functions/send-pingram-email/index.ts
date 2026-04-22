import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Pingram } from "npm:pingram";

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
