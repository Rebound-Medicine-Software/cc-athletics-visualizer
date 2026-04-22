import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  // Use 'email' for live sends, 'email_compose_preview' for testing
  type?: "email" | "email_compose_preview";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PINGRAM_API_KEY = Deno.env.get("PINGRAM_API_KEY");
    if (!PINGRAM_API_KEY) {
      throw new Error("PINGRAM_API_KEY is not configured");
    }

    const body: PingramRequest = await req.json();
    const { templateId, to, parameters = {}, type = "email" } = body;

    if (!templateId || !to?.email) {
      return new Response(
        JSON.stringify({ error: "templateId and to.email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Pingram] Sending template '${templateId}' to ${to.email} (type: ${type})`);

    const pingramRes = await fetch("https://api.pingram.io/v1/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        templateId,
        to: {
          id: to.id ?? to.email,
          email: to.email,
          ...(to.number ? { number: to.number } : {}),
          ...(to.slackChannel ? { slackChannel: to.slackChannel } : {}),
        },
        parameters,
      }),
    });

    const responseText = await pingramRes.text();
    console.log(`[Pingram] Status: ${pingramRes.status}, Body: ${responseText.slice(0, 500)}`);

    if (!pingramRes.ok) {
      return new Response(
        JSON.stringify({ error: `Pingram API failed [${pingramRes.status}]: ${responseText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: any = null;
    try { parsed = JSON.parse(responseText); } catch { /* not JSON */ }

    return new Response(
      JSON.stringify({ success: true, templateId, to: to.email, response: parsed }),
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
