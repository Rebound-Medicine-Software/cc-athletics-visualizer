import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Kpi {
  lead_load_pct?: number;
  weight_transfer_pct?: number;
  tempo_ratio?: number;
  cop_efficiency?: number;
  transition_ms?: number;
  peak_force?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const kpis: Kpi[] = Array.isArray(body?.kpis) ? body.kpis : [];
    const coachTags: string[] = Array.isArray(body?.coachTags) ? body.coachTags : [];
    const findings = body?.findings ?? {};

    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    const summarise = (k: keyof Kpi) =>
      kpis.length ? (kpis.reduce((a, b) => a + (b[k] ?? 0), 0) / kpis.length).toFixed(1) : '—';

    const localSummary =
      `Session contains ${kpis.length} swing${kpis.length === 1 ? '' : 's'}. ` +
      `Avg lead-side loading at impact: ${summarise('lead_load_pct')}%. ` +
      `Avg weight transfer (top→impact): ${summarise('weight_transfer_pct')}%. ` +
      `Tempo ratio: ${summarise('tempo_ratio')}. ` +
      `Transition: ${summarise('transition_ms')} ms. ` +
      (coachTags.length ? `Coach tags: ${coachTags.join(', ')}. ` : '') +
      (findings?.technical?.length
        ? `Key technical findings: ${(findings.technical as any[]).slice(0, 3).map((t) => t.label).join('; ')}.`
        : 'No critical technical flags.');

    if (!apiKey) {
      return new Response(JSON.stringify({ summary: localSummary, source: 'local' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a strength & conditioning practitioner reviewing a golf swing force-plate session. ` +
      `Write a concise 3-4 sentence session summary highlighting weight transfer, lead loading, tempo, ` +
      `and the top prescription priority. Be specific with numbers.\n\nKPIs (per swing):\n` +
      JSON.stringify(kpis, null, 2) + `\n\nCoach tags: ${coachTags.join(', ') || 'none'}\n\n` +
      `Findings: ${JSON.stringify(findings)}`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ summary: localSummary, source: 'local-fallback', error: resp.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await resp.json();
    const summary = data?.choices?.[0]?.message?.content ?? localSummary;
    return new Response(JSON.stringify({ summary, source: 'ai' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
