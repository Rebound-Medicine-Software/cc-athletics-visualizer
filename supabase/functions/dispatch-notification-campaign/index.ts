// Dispatches a queued platform notification campaign via NotificationAPI (email channel).
// Other channels (in_app, webhook) are currently logged-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFAPI_CLIENT_ID = Deno.env.get("NOTIFICATIONAPI_CLIENT_ID");
const NOTIFAPI_CLIENT_SECRET = Deno.env.get("NOTIFICATIONAPI_CLIENT_SECRET");
const NOTIFAPI_TEMPLATE = Deno.env.get("NOTIFICATIONAPI_PLATFORM_TEMPLATE") ?? "platform_announcement";

interface AudienceRow {
  team_id: string;
  organisation_name: string | null;
  owner_email: string | null;
  tier_name: string | null;
  subscription_status: string | null;
  churn_risk_score: number | null;
}

async function sendOneEmail(to: string, subject: string, body: string, campaignId: string) {
  if (!NOTIFAPI_CLIENT_ID || !NOTIFAPI_CLIENT_SECRET) {
    throw new Error("NotificationAPI credentials not configured");
  }
  const auth = btoa(`${NOTIFAPI_CLIENT_ID}:${NOTIFAPI_CLIENT_SECRET}`);
  const res = await fetch(
    `https://api.eu.notificationapi.com/${NOTIFAPI_CLIENT_ID}/sender`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        notificationId: NOTIFAPI_TEMPLATE,
        user: { id: to, email: to },
        mergeTags: { subject, message: body, campaign_id: campaignId },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NotificationAPI ${res.status}: ${text.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load campaign
    const { data: campaign, error: cErr } = await supabase
      .from("platform_notification_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .maybeSingle();
    if (cErr || !campaign) throw new Error(`Campaign not found: ${cErr?.message ?? ""}`);
    if (campaign.status !== "queued") {
      return new Response(
        JSON.stringify({ skipped: true, reason: `status is ${campaign.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("platform_notification_campaigns")
      .update({ status: "sending" }).eq("id", campaign_id);

    // Resolve audience
    const { data: audience, error: aErr } = await supabase.rpc(
      "preview_notification_audience",
      { p_target_type: campaign.target_type, p_target_value: campaign.target_value },
    );
    if (aErr) throw new Error(`Audience error: ${aErr.message}`);
    const rows: AudienceRow[] = (audience ?? []) as AudienceRow[];

    let delivered = 0;
    let failed = 0;
    const errors: string[] = [];

    if (campaign.delivery_channel === "email") {
      for (const r of rows) {
        if (!r.owner_email) { failed++; errors.push(`${r.organisation_name}: no email`); continue; }
        try {
          await sendOneEmail(r.owner_email, campaign.title, campaign.message, campaign_id);
          delivered++;
        } catch (e) {
          failed++;
          errors.push(`${r.owner_email}: ${(e as Error).message}`);
        }
      }
    } else {
      // in_app / webhook — record-only for now
      delivered = rows.length;
    }

    const finalStatus = failed > 0 && delivered === 0 ? "failed" : "sent";

    await supabase.from("platform_notification_campaigns").update({
      status: finalStatus,
      delivered_count: delivered,
      failed_count: failed,
      sent_at: new Date().toISOString(),
      error_summary: errors.slice(0, 10).join(" | ") || null,
    }).eq("id", campaign_id);

    await supabase.from("platform_activity_logs").insert({
      event_type: finalStatus === "sent" ? "notification_campaign_sent" : "notification_campaign_failed",
      event_source: "notifications_centre",
      severity: finalStatus === "sent" ? "info" : "critical",
      metadata: {
        campaign_id,
        title: campaign.title,
        delivered,
        failed,
        recipient_count: rows.length,
        delivery_channel: campaign.delivery_channel,
      },
    });

    return new Response(
      JSON.stringify({ campaign_id, status: finalStatus, delivered, failed, recipients: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
