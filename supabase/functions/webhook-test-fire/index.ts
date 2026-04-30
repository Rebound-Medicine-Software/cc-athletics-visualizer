// webhook-test-fire — Super Admin only.
// Sends a small safe test payload to a single configured webhook endpoint,
// updates last_success_at / last_failure_at on the endpoint, and writes an
// audit row. Never returns the stored secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    // Validate caller via anon client + their JWT
    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isSa, error: saErr } = await admin.rpc("is_super_admin_check", {
      p_user_id: userData.user.id,
    }).maybeSingle?.() ?? { data: null, error: null };

    // Fallback: query profile if helper RPC not present
    let allowed = false;
    if (!saErr && isSa === true) {
      allowed = true;
    } else {
      const { data: prof } = await admin
        .from("profiles").select("role").eq("user_id", userData.user.id).maybeSingle();
      allowed = prof?.role === "super_admin";
    }
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const endpoint_id: string | undefined = body?.endpoint_id;
    if (!endpoint_id) return json({ error: "endpoint_id required" }, 400);

    const { data: ep, error: epErr } = await admin
      .from("platform_webhook_endpoints")
      .select("id, label, url, secret, is_active")
      .eq("id", endpoint_id)
      .maybeSingle();
    if (epErr || !ep) return json({ error: "endpoint_not_found" }, 404);
    if (!ep.is_active) return json({ error: "endpoint_disabled" }, 409);

    // SSRF guard: re-validate URL before sending (defence-in-depth)
    const ssrfReason = checkSsrf(ep.url);
    if (ssrfReason) {
      await callerClient.rpc("log_webhook_test_blocked", {
        p_endpoint_id: ep.id,
        p_reason: ssrfReason,
        p_url: ep.url,
      });
      return json({ success: false, blocked: true, reason: ssrfReason }, 400);
    }

    const payload = {
      type: "test_event",
      source: "nexushub.control_centre",
      endpoint_id: ep.id,
      label: ep.label,
      message: "This is a Super Admin test event from NEXUS HUB.",
      sent_at: new Date().toISOString(),
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ep.secret) headers["X-Webhook-Secret"] = ep.secret;

    let success = false;
    let statusCode: number | null = null;
    let reason: string | null = null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(ep.url, {
        method: "POST", headers, body: JSON.stringify(payload), signal: ctrl.signal,
      });
      statusCode = res.status;
      success = res.ok;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        reason = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      }
    } catch (e) {
      reason = (e as Error).message?.slice(0, 200) ?? "network_error";
    } finally {
      clearTimeout(timer);
    }

    // Update endpoint timestamps (no secret returned)
    await admin.rpc("mark_webhook_endpoint_result", {
      p_endpoint_id: ep.id,
      p_success: success,
      p_reason: reason,
    });

    // Write audit row via SECURITY DEFINER RPC under caller context
    await callerClient.rpc("log_webhook_test_fired", {
      p_endpoint_id: ep.id,
      p_success: success,
      p_status_code: statusCode,
      p_reason: reason,
    });

    return json({ success, status_code: statusCode, reason });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
