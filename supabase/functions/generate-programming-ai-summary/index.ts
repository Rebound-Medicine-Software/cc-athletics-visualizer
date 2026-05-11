import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logActivity, logIntegrationHealth } from "../_shared/logActivity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutcomeRow {
  label: string;
  unit: string;
  before?: { date: string; value: number } | null;
  after?: { date: string; value: number } | null;
  changePct?: number | null;
}

interface RecentLog {
  performed_on: string;
  sets_completed?: number | null;
  reps_completed?: string | null;
  load_used?: string | null;
  rpe?: number | null;
  notes?: string | null;
}

interface RequestBody {
  team_id: string | null;
  athlete_id: string | null;
  athlete_name?: string | null;
  assignment_id: string;
  programme_name?: string | null;
  programme_goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  adherence: {
    adherencePercentage: number;
    completedSessions: number;
    missedSessions: number;
    totalSessionsToDate: number;
    totalSessionsAll: number;
    currentStreak: number;
    lastCompletedDate: string | null;
    weekAdherence?: number;
  };
  outcomes: OutcomeRow[];
  recentLogs: RecentLog[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTs = Date.now();
  let teamId: string | null = null;
  let athleteId: string | null = null;
  let assignmentId: string | null = null;

  try {
    const body = (await req.json()) as RequestBody;
    teamId = body.team_id ?? null;
    athleteId = body.athlete_id ?? null;
    assignmentId = body.assignment_id;

    if (!assignmentId) {
      return new Response(JSON.stringify({ error: "assignment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const outcomeLines = (body.outcomes ?? [])
      .filter((o) => o.before && o.after)
      .map(
        (o) =>
          `- ${o.label}: ${o.before!.value.toFixed(2)}${o.unit ? ` ${o.unit}` : ""} (${o.before!.date}) → ${o.after!.value.toFixed(2)}${o.unit ? ` ${o.unit}` : ""} (${o.after!.date})${o.changePct != null ? ` [${o.changePct >= 0 ? "+" : ""}${o.changePct.toFixed(1)}%]` : ""}`
      );

    const recentLogLines = (body.recentLogs ?? []).slice(0, 8).map(
      (l) =>
        `- ${l.performed_on}: ${[
          l.sets_completed != null ? `${l.sets_completed}×${l.reps_completed ?? "–"}` : null,
          l.load_used ? `@ ${l.load_used}` : null,
          l.rpe != null ? `RPE ${l.rpe}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}${l.notes ? ` — ${l.notes}` : ""}`
    );

    const systemPrompt = `You are a sports performance coach assistant. Produce a concise, clinical-tone summary of an athlete's training programme adherence and observed performance changes.

Strict safety rules:
- NEVER claim that the programme caused a performance change.
- Use phrases like "observed alongside", "may suggest", "consider reviewing".
- Do not give medical or injury diagnoses.
- Use British English (programme, optimise, analyse).
- Be concise. Avoid filler.

Return JSON only with this exact shape:
{
  "summary": "2-4 sentence plain-English overview",
  "goingWell": ["bullet 1", "bullet 2"],
  "needsAttention": ["bullet 1", "bullet 2"],
  "talkingPoints": ["practitioner talking point 1", "..."],
  "nextSessionCues": ["coaching cue 1", "..."]
}`;

    const userPrompt = `Athlete: ${body.athlete_name ?? "Unnamed"}
Programme: ${body.programme_name ?? "Unnamed programme"}
Goal: ${body.programme_goal ?? "—"}
Start: ${body.start_date ?? "—"} | End: ${body.end_date ?? "ongoing"} | Status: ${body.status ?? "—"}

Adherence:
- ${body.adherence.adherencePercentage}% overall (${body.adherence.completedSessions}/${body.adherence.totalSessionsToDate} sessions to date; ${body.adherence.missedSessions} missed; ${body.adherence.totalSessionsAll} total scheduled)
- Current streak: ${body.adherence.currentStreak}
- Last completed: ${body.adherence.lastCompletedDate ?? "—"}
- This week: ${body.adherence.weekAdherence ?? "—"}%

Observed test changes during programme (do NOT claim causation):
${outcomeLines.length ? outcomeLines.join("\n") : "- No paired test data available."}

Recent completion logs:
${recentLogLines.length ? recentLogLines.join("\n") : "- None."}

Generate the JSON summary now.`;

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
        temperature: 0.5,
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
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    let summary: any;
    try {
      const m = content.match(/\{[\s\S]*\}/);
      summary = m ? JSON.parse(m[0]) : null;
    } catch (e) {
      console.error("parse error", e);
    }
    if (!summary) {
      summary = {
        summary: typeof content === "string" ? content : "Unable to generate a structured summary.",
        goingWell: [],
        needsAttention: [],
        talkingPoints: [],
        nextSessionCues: [],
      };
    }

    const durationMs = Date.now() - startTs;
    await logActivity({
      eventType: "programming_ai_summary_generated",
      eventSource: "generate-programming-ai-summary",
      severity: "success",
      teamId,
      athleteId,
      metadata: {
        assignment_id: assignmentId,
        adherence_pct: body.adherence.adherencePercentage,
        outcomes_compared: outcomeLines.length,
        duration_ms: durationMs,
      },
    });
    await logIntegrationHealth("lovable_ai_gateway", "success", {
      teamId,
      latencyMs: durationMs,
      payload: { route: "programming_ai_summary" },
    });

    return new Response(
      JSON.stringify({ success: true, summary, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTs;
    console.error("programming-ai-summary error", errMsg);
    await logIntegrationHealth("lovable_ai_gateway", "failed", {
      teamId,
      latencyMs: durationMs,
      failureReason: `programming_ai_summary: ${errMsg}`.slice(0, 500),
    });
    await logActivity({
      eventType: "programming_ai_summary_failed",
      eventSource: "generate-programming-ai-summary",
      severity: "warning",
      teamId,
      athleteId,
      metadata: { assignment_id: assignmentId, duration_ms: durationMs, error: errMsg },
    });
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
