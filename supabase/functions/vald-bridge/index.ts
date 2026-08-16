/**
 * NEXUS HUB — VALD Bridge Edge Function
 * ─────────────────────────────────────────────────────────────────
 * Single edge function handling all VALD API calls.
 * Credentials live as Supabase Secrets, never in source code.
 *
 * Routes (via `action` query param):
 *   GET  ?action=athletes                       → list all athletes in tenant
 *   GET  ?action=tests&athleteId=<id>           → test sessions for one athlete
 *   GET  ?action=detail&testId=<id>             → full metrics for one test
 *
 * Setup — run once in your terminal:
 *   supabase secrets set VALD_CLIENT_ID=your_client_id
 *   supabase secrets set VALD_CLIENT_SECRET=your_client_secret
 *   supabase secrets set VALD_TENANT_ID=your_tenant_id
 *   supabase secrets set VALD_REGION=eu
 *
 * Deploy:
 *   supabase functions deploy vald-bridge
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── CORS headers ───────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// ── Config ─────────────────────────────────────────────────────────────────────
// VALD migrated external API auth to Auth0 in March 2026. The legacy
// security.valdperformance.com/connect/token host no longer resolves.
const AUTH_URL = "https://auth.prd.vald.com/oauth/token";
const AUTH_AUDIENCE = "vald-api-external";

// VALD_REGION accepts either short codes (eu/us/au) or raw region codes (euw/use/aue).
const REGION_ALIASES: Record<string, string> = { eu: "euw", us: "use", au: "aue" };

function regionCode(): string {
  const raw = (Deno.env.get("VALD_REGION") ?? "euw").toLowerCase();
  return REGION_ALIASES[raw] ?? raw;
}

function serviceHost(service: "profile" | "forcedecks" | "tenants"): string {
  const r = regionCode();
  const suffix =
    service === "profile" ? "externalprofile"
    : service === "forcedecks" ? "extforcedecks"
    : "externaltenants";
  return `https://prd-${r}-api-${suffix}.valdperformance.com`;
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const clientId = Deno.env.get("VALD_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("VALD_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) throw new Error("VALD_CLIENT_ID and VALD_CLIENT_SECRET must be set as Supabase Secrets");
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: AUTH_AUDIENCE,
    }),
  });
  if (!res.ok) throw new Error(`VALD auth failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  cachedToken = data.access_token as string;
  tokenExpiry = Date.now() + ((data.expires_in as number) - 120) * 1000;
  return cachedToken;
}

async function valdFetch(service: "profile" | "forcedecks" | "tenants", path: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${serviceHost(service)}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`VALD API ${res.status} at ${path}: ${await res.text()}`);
  return res.json();
}


interface ValdResult {
  result?: string;
  definition?: { result?: string };
  value: number;
  resultUnitScaleFactor?: number;
  limb?: string;
}

function getMetric(results: ValdResult[], key: string, limb?: string): number | null {
  const r = results.find((m) => (m.result ?? m.definition?.result ?? "") === key && (!limb || m.limb === limb));
  if (!r) return null;
  return Math.round(r.value * (r.resultUnitScaleFactor ?? 1) * 100) / 100;
}

async function handleAthletes(tenantId: string) {
  const data = await valdFetch("profile", `/profiles?TenantId=${tenantId}`) as Record<string, unknown>;
  const list = Array.isArray(data) ? data : ((data.profiles ?? data.data ?? []) as Record<string, unknown>[]);
  const athletes = list.map((a) => ({
    id: a.id ?? a.profileId ?? "", number: a.externalId ?? "",
    name: `${a.givenName ?? ""} ${a.familyName ?? ""}`.trim(),
    givenName: a.givenName ?? "", familyName: a.familyName ?? "",
    dob: a.dateOfBirth ?? "", sex: a.sex ?? "",
    teams: ((a.teams as { name: string }[]) ?? []).map((t) => t.name).join(", "),
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { athletes, count: athletes.length };
}

async function handleTests(tenantId: string, athleteId: string) {
  const data = await valdFetch("forcedecks", `/v2019q3/teams/${tenantId}/tests?athleteId=${athleteId}`) as Record<string, unknown>;
  const list = Array.isArray(data) ? data : ((data.tests ?? data.data ?? []) as Record<string, unknown>[]);
  const tests = list.map((t) => {
    const results = (t.results ?? []) as ValdResult[];
    return {
      id: t.id,
      date: typeof t.recordedUTC === "string" ? t.recordedUTC.slice(0, 10) : "",
      type: t.testType ?? t.type ?? "Unknown",
      cmjH: getMetric(results, "JMP_HEIGHT_IMP_MOM", "Both"),
      cmjHL: getMetric(results, "JMP_HEIGHT_IMP_MOM", "Left"),
      cmjHR: getMetric(results, "JMP_HEIGHT_IMP_MOM", "Right"),
      cmjRSI: getMetric(results, "RSI_MODIFIED", "Both"),
      cmjPP: getMetric(results, "PEAK_PROPULSIVE_PWR", "Both"),
      cmjAsym: getMetric(results, "ASYM_INDEX", "Both"),
      djH: getMetric(results, "JMP_HEIGHT_FLIGHT_TIME", "Both"),
      djRSI: getMetric(results, "REACTIVE_STR_IDX", "Both"),
      djCT: getMetric(results, "CONTRACTION_TIME", "Both"),
      pjH: getMetric(results, "JMP_HEIGHT_FLIGHT_TIME", "Both"),
      pjRSI: getMetric(results, "RSI_MODIFIED", "Both"),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
  return { tests, count: tests.length };
}

async function handleDetail(tenantId: string, testId: string) {
  const data = await valdFetch("forcedecks", `/v2019q3/teams/${tenantId}/tests/${testId}/trials`) as Record<string, unknown>;
  const trials = Array.isArray(data) ? data : ((data.trials ?? data.data ?? [data]) as Record<string, unknown>[]);
  const best = (trials[0] ?? {}) as Record<string, unknown>;
  const res = (best.results ?? []) as ValdResult[];
  const raw: Record<string, number> = {};
  res.forEach((m) => { const k = `${m.result ?? m.definition?.result ?? "UNKNOWN"}_${m.limb ?? "Both"}`; raw[k] = Math.round(m.value * (m.resultUnitScaleFactor ?? 1) * 100) / 100; });
  return {
    trialCount: trials.length, raw,
    cmjH: getMetric(res, "JMP_HEIGHT_IMP_MOM", "Both"),
    cmjHL: getMetric(res, "JMP_HEIGHT_IMP_MOM", "Left"),
    cmjHR: getMetric(res, "JMP_HEIGHT_IMP_MOM", "Right"),
    cmjRSI: getMetric(res, "RSI_MODIFIED", "Both"),
    cmjPP: getMetric(res, "PEAK_PROPULSIVE_PWR", "Both"),
    cmjAsym: getMetric(res, "ASYM_INDEX", "Both"),
    djH: getMetric(res, "JMP_HEIGHT_FLIGHT_TIME", "Both"),
    djRSI: getMetric(res, "REACTIVE_STR_IDX", "Both"),
    djCT: getMetric(res, "CONTRACTION_TIME", "Both"),
    djL: getMetric(res, "PEAK_LANDING_FORCE", "Left"),
    djR: getMetric(res, "PEAK_LANDING_FORCE", "Right"),
    djAsym: getMetric(res, "ASYM_INDEX", "Both"),
    pjH: getMetric(res, "JMP_HEIGHT_FLIGHT_TIME", "Both"),
    pjRSI: getMetric(res, "RSI_MODIFIED", "Both"),
    pjCT: getMetric(res, "CONTRACTION_TIME", "Both"),
    solL: getMetric(res, "PEAK_FORCE", "Left"),
    solR: getMetric(res, "PEAK_FORCE", "Right"),
    gasL: getMetric(res, "FORCE_250MS", "Left"),
    gasR: getMetric(res, "FORCE_250MS", "Right"),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "athletes";
    const tenantId = Deno.env.get("VALD_TENANT_ID") ?? "";
    if (!tenantId) throw new Error("VALD_TENANT_ID must be set as a Supabase Secret");
    let payload: unknown;
    switch (action) {
      case "athletes": payload = await handleAthletes(tenantId); break;
      case "tests": {
        const athleteId = url.searchParams.get("athleteId") ?? "";
        if (!athleteId) throw new Error("athleteId query param required");
        payload = await handleTests(tenantId, athleteId); break;
      }
      case "detail": {
        const testId = url.searchParams.get("testId") ?? "";
        if (!testId) throw new Error("testId query param required");
        payload = await handleDetail(tenantId, testId); break;
      }
      default: throw new Error(`Unknown action: ${action}. Use athletes | tests | detail`);
    }
    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[vald-bridge]", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
