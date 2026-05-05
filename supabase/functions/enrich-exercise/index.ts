import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichItem {
  id: string;
  name: string;
  description?: string;
}

const SYSTEM = `You are a strength & conditioning expert. For each exercise, return concise structured metadata.
Rules:
- primary_muscles: 1-4 short canonical muscle group names (e.g. "Glutes", "Hamstrings", "Quads", "Lats").
- equipment: 0-3 equipment items (e.g. "Barbell", "Dumbbell", "Bodyweight").
- category: one of Strength, Power, Plyometric, Mobility, Conditioning, Rehab, Warm-up, Other.
- instructions: 1-3 short coaching cues, plain text, <=300 chars.
Return ONLY valid JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { items } = await req.json() as { items: EnrichItem[] };
    if (!Array.isArray(items) || items.length === 0 || items.length > 25) {
      return new Response(JSON.stringify({ error: "items[] required (1-25)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Enrich these exercises. Respond as {"results":[{"id","primary_muscles":[],"equipment":[],"category","instructions"}]}.
Exercises:
${items.map((i) => `- id=${i.id} name=${JSON.stringify(i.name)} desc=${JSON.stringify(i.description ?? "")}`).join("\n")}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI gateway ${r.status}: ${t}` }), {
        status: r.status === 429 || r.status === 402 ? r.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    return new Response(JSON.stringify({ results: parsed.results ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
