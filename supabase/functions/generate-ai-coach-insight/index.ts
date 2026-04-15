import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const { testMetrics } = await req.json() as { testMetrics: TestMetrics };
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

    return new Response(JSON.stringify({ success: true, insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Coach Insight error:", error);
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
