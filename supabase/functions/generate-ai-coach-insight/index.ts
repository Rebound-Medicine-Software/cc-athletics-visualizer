import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logActivity, logIntegrationHealth } from "../_shared/logActivity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestMetrics {
  testName: string;
  testDate: string;
  currentValue?: number;
  previousValues?: number[];
  baseline?: number;
  personalRecord?: number;
  leftLimb?: number;
  rightLimb?: number;
  asymmetryPercent?: number;
  metricUnit?: string;
  metricType?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTs = Date.now();
  let teamIdForLog: string | null = null;
  let athleteIdForLog: string | null = null;
  let testNameForLog: string | null = null;

  try {
    const body = await req.json() as {
      testMetrics: TestMetrics;
      team_id?: string | null;
      athlete_id?: string | null;
      created_by?: string | null;
      force_refresh?: boolean;
    };
    const testMetrics = body.testMetrics;
    teamIdForLog = body.team_id ?? null;
    athleteIdForLog = body.athlete_id ?? null;
    testNameForLog = testMetrics?.testName ?? null;

    // Build a deterministic source-metrics fingerprint (no raw PII stored)
    const hashInput = JSON.stringify({
      t: testMetrics?.testName ?? "",
      d: testMetrics?.testDate ?? "",
      cv: testMetrics?.currentValue ?? null,
      pv: testMetrics?.previousValues ?? [],
      bl: testMetrics?.baseline ?? null,
      pr: testMetrics?.personalRecord ?? null,
      ll: testMetrics?.leftLimb ?? null,
      rl: testMetrics?.rightLimb ?? null,
      asym: testMetrics?.asymmetryPercent ?? null,
      mu: testMetrics?.metricUnit ?? "",
      mt: testMetrics?.metricType ?? "",
    });
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
    const sourceHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // ---------- CACHE LOOKUP ----------
    if (!body.force_refresh && teamIdForLog) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
        const sUrl = Deno.env.get("SUPABASE_URL");
        const sKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (sUrl && sKey) {
          const svc = createClient(sUrl, sKey, { auth: { persistSession: false } });
          const { data: cached } = await svc
            .from("ai_coach_insights")
            .select("insight, created_at")
            .eq("team_id", teamIdForLog)
            .eq("test_name", testMetrics.testName)
            .eq("source_metrics_hash", sourceHash)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cached?.insight) {
            const durationMs = Date.now() - startTs;
            await logActivity({
              eventType: "ai_coach_insight_cache_hit",
              eventSource: "generate-ai-coach-insight",
              severity: "info",
              teamId: teamIdForLog,
              athleteId: athleteIdForLog,
              metadata: {
                test_name: testNameForLog,
                test_date: testMetrics.testDate,
                duration_ms: durationMs,
                source_metrics_hash: sourceHash,
              },
            });
            return new Response(
              JSON.stringify({ success: true, insight: cached.insight, cached: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          await logActivity({
            eventType: "ai_coach_insight_cache_miss",
            eventSource: "generate-ai-coach-insight",
            severity: "info",
            teamId: teamIdForLog,
            athleteId: athleteIdForLog,
            metadata: {
              test_name: testNameForLog,
              source_metrics_hash: sourceHash,
            },
          });
        }
      } catch (cacheErr) {
        console.error("[ai-coach] cache lookup failed", cacheErr);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert sports performance coach specialising in force-plate testing and athletic performance analysis. 
Your role is to provide clear, actionable insights based on force-plate test results.

Guidelines:
- Use British English spelling throughout (e.g. "optimise", "analyse", "programme", "centre", "defence", "favour", "colour")
- Be concise and practical. Athletes should understand immediately
- Focus on actionable training recommendations
- Avoid medical advice or injury diagnosis
- Use positive, encouraging language
- Reference specific metrics when making recommendations
- Include 2-4 specific training recommendations
- Add 1-2 key coaching cues the athlete can focus on during training
- Do NOT include any weekly plan, schedule, or micro-plan
- Do NOT overuse dashes or hyphens. Use commas, full stops, or semicolons instead

Format your response as JSON with the following structure:
{
  "explanation": "Brief plain-English explanation of what this test/metric indicates and why it matters (2-3 sentences)",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3", "Recommendation 4"],
  "keyCues": ["Coaching cue 1", "Coaching cue 2"]
}`;

    const userPrompt = `Analyze these force-plate test results and provide Report Insights:

Test Name: ${testMetrics.testName}
Test Date: ${testMetrics.testDate}
${testMetrics.currentValue !== undefined ? `Current Value: ${testMetrics.currentValue} ${testMetrics.metricUnit || ''}` : ''}
${testMetrics.personalRecord !== undefined ? `Personal Record: ${testMetrics.personalRecord} ${testMetrics.metricUnit || ''}` : ''}
${testMetrics.baseline !== undefined ? `Baseline (avg): ${testMetrics.baseline} ${testMetrics.metricUnit || ''}` : ''}
${testMetrics.previousValues?.length ? `Recent History: ${testMetrics.previousValues.join(', ')} ${testMetrics.metricUnit || ''}` : ''}
${testMetrics.leftLimb !== undefined && testMetrics.rightLimb !== undefined ? `
Left Limb: ${testMetrics.leftLimb} ${testMetrics.metricUnit || ''}
Right Limb: ${testMetrics.rightLimb} ${testMetrics.metricUnit || ''}
Asymmetry: ${testMetrics.asymmetryPercent?.toFixed(1)}% (Formula: |Left - Right| / Max(Left, Right) × 100)` : ''}

Provide a short explanation of what this test measures and why it matters, followed by 2-4 practical training recommendations to improve this metric, and 1-2 coaching cues.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Try to parse the JSON response
    let insight;
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insight = JSON.parse(jsonMatch[0]);
        // Remove weeklyProgression if it exists (we don't want micro-plans)
        delete insight.weeklyProgression;
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback to raw content
      insight = {
        explanation: content,
        recommendations: ["Continue with current training protocol"],
        keyCues: ["Focus on form and technique"],
      };
    }

    const durationMs = Date.now() - startTs;
    await logActivity({
      eventType: 'ai_coach_insight_generated',
      eventSource: 'generate-ai-coach-insight',
      severity: 'success',
      teamId: teamIdForLog,
      athleteId: athleteIdForLog,
      metadata: {
        report_type: 'ai-coach-insight',
        test_name: testNameForLog,
        test_date: testMetrics.testDate,
        duration_ms: durationMs,
      },
    });
    await logIntegrationHealth('lovable_ai_gateway', 'success', {
      teamId: teamIdForLog,
      latencyMs: durationMs,
      payload: { route: 'ai_coach_insight' },
    });

    return new Response(JSON.stringify({ success: true, insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Coach Insight error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTs;
    await logIntegrationHealth('lovable_ai_gateway', 'failed', {
      teamId: teamIdForLog,
      latencyMs: durationMs,
      failureReason: `ai coach: ${errMsg}`.slice(0, 500),
    });
    await logActivity({
      eventType: 'ai_coach_insight_failed',
      eventSource: 'generate-ai-coach-insight',
      severity: 'warning',
      teamId: teamIdForLog,
      athleteId: athleteIdForLog,
      metadata: {
        report_type: 'ai-coach-insight',
        test_name: testNameForLog,
        duration_ms: durationMs,
        error: errMsg,
      },
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        insight: {
          explanation: "Unable to generate insight at this time. Please try again later.",
          recommendations: ["Maintain current training protocol"],
          keyCues: ["Focus on consistency"],
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
