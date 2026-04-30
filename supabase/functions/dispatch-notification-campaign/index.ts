// Dispatches a queued platform notification campaign across email, in_app, and webhook channels.
// - email   → NotificationAPI to each org owner email
// - in_app  → inserts into platform_in_app_notifications for each recipient owner_user_id
// - webhook → POSTs payload to all active platform_webhook_endpoints (filtered by team if scoped)
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

async function postWebhook(url: string, secret: string | null, payload: Record<string, unknown>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Webhook-Secret"] = secret;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Webhook ${res.status}: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
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
    let auditEvent = "notification_campaign_sent";

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
    } else if (campaign.delivery_channel === "in_app") {
      auditEvent = "notification_campaign_in_app_sent";
      // Resolve owner_user_id for each team in audience
      const teamIds = rows.map((r) => r.team_id).filter(Boolean);
      const { data: teams } = await supabase
        .from("teams")
        .select("id, owner_user_id, name")
        .in("id", teamIds);
      const ownerByTeam = new Map<string, { user: string | null; name: string | null }>();
      (teams ?? []).forEach((t: any) => ownerByTeam.set(t.id, { user: t.owner_user_id, name: t.name }));

      const inserts: any[] = [];
      for (const r of rows) {
        const owner = ownerByTeam.get(r.team_id);
        if (!owner?.user) { failed++; errors.push(`${r.organisation_name ?? r.team_id}: no owner_user_id`); continue; }
        inserts.push({
          campaign_id,
          team_id: r.team_id,
          recipient_user_id: owner.user,
          title: campaign.title,
          message: campaign.message,
          severity: "info",
          metadata: { delivery_channel: "in_app", organisation_name: r.organisation_name },
        });
      }
      if (inserts.length > 0) {
        const { error: insErr, count } = await supabase
          .from("platform_in_app_notifications")
          .insert(inserts, { count: "exact" });
        if (insErr) {
          failed += inserts.length;
          errors.push(`in_app insert failed: ${insErr.message}`);
        } else {
          delivered += count ?? inserts.length;
        }
      }
    } else if (campaign.delivery_channel === "webhook") {
      // Determine which webhook endpoints apply
      const teamIds = rows.map((r) => r.team_id).filter(Boolean);
      const { data: endpoints } = await supabase
        .from("platform_webhook_endpoints")
        .select("id, team_id, url, secret, is_active")
        .eq("is_active", true);

      const applicable = (endpoints ?? []).filter((ep: any) =>
        ep.team_id == null || teamIds.includes(ep.team_id)
      );

      if (applicable.length === 0) {
        // No configured endpoints — fail clearly, do not fake delivery
        await supabase.from("platform_notification_campaigns").update({
          status: "failed",
          delivered_count: 0,
          failed_count: rows.length,
          sent_at: new Date().toISOString(),
          error_summary: "webhook_not_configured",
        }).eq("id", campaign_id);

        await supabase.from("platform_activity_logs").insert({
          event_type: "notification_campaign_webhook_failed",
          event_source: "notifications_centre",
          severity: "warning",
          metadata: { campaign_id, reason: "webhook_not_configured", recipient_count: rows.length },
        });
        return new Response(
          JSON.stringify({ campaign_id, status: "failed", delivered: 0, failed: rows.length, error: "webhook_not_configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      auditEvent = "notification_campaign_webhook_sent";
      const payload = {
        type: "platform_announcement",
        campaign_id,
        title: campaign.title,
        message: campaign.message,
        target_type: campaign.target_type,
        target_value: campaign.target_value,
        recipients: rows.map((r) => ({ team_id: r.team_id, organisation_name: r.organisation_name })),
        sent_at: new Date().toISOString(),
      };

      for (const ep of applicable) {
        try {
          await postWebhook(ep.url, ep.secret, payload);
          delivered++;
          await supabase.from("platform_webhook_endpoints")
            .update({ last_success_at: new Date().toISOString(), failure_reason: null })
            .eq("id", ep.id);
        } catch (e) {
          failed++;
          const msg = (e as Error).message;
          errors.push(`webhook ${ep.id}: ${msg}`);
          await supabase.from("platform_webhook_endpoints")
            .update({ last_failure_at: new Date().toISOString(), failure_reason: msg.slice(0, 500) })
            .eq("id", ep.id);
        }
      }
    } else {
      throw new Error(`Unsupported delivery_channel: ${campaign.delivery_channel}`);
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
      event_type: finalStatus === "sent" ? auditEvent : `${auditEvent.replace("_sent", "")}_failed`,
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
