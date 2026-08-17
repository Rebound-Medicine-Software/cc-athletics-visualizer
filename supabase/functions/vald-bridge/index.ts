/**
 * NEXUS HUB — VALD Bridge Edge Function v3
 * ─────────────────────────────────────────────────────────────────────────────
 * Built from VALD official API documentation (support.vald.com):
 *   · How to integrate with VALD APIs
 *   · A guide to using the External Profiles API
 *   · A guide to using the External ForceDecks API
 *
 * ARCHITECTURE
 *   Auth        → https://auth.prd.vald.com/oauth/token  (audience: vald-api-external)
 *   Profiles    → https://prd-{r}-api-externalprofile.valdperformance.com
 *   ForceDecks  → https://prd-{r}-api-extforcedecks.valdperformance.com
 *
 * ENDPOINTS
 *   Athletes : GET /profiles?tenantId=X
 *   Tests    : GET /tests?tenantId=X&modifiedFromUtc=Y&profileId=Z
 *              (falls back to /v2019q3/teams/{tenantId}/tests?athleteId=Z&modifiedFrom=Y)
 *   Detail   : GET /v2019q3/teams/{tenantId}/tests/{testId}/trials
 *
 * NOTES
 *   - /tests is primarily metadata; when metric results are present they are mapped too
 *     so the existing report hub keeps working.
 *   - Metric values: value × definition.resultUnitScaleFactor = display unit.
 *   - modifiedFromUtc is REQUIRED on /tests.
 *   - VALD returns 204 with an empty body when there are no results.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── CORS ──────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// ── REGIONAL BASE URLS ────────────────────────────────────────────────────────
// VALD_REGION accepts short codes (eu/us/au) or raw region codes (euw/use/aue).

const REGION_ALIASES: Record<string, string> = { eu: "euw", us: "use", au: "aue" };

function regionCode(): string {
  const raw = (Deno.env.get("VALD_REGION") ?? "euw").toLowerCase();
  return REGION_ALIASES[raw] ?? raw;
}

function profilesBase(): string {
  return `https://prd-${regionCode()}-api-externalprofile.valdperformance.com`;
}

function forcedecksBase(): string {
  return `https://prd-${regionCode()}-api-extforcedecks.valdperformance.com`;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

let _token = "";
let _expiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _expiry) return _token;

  const clientId = Deno.env.get("VALD_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("VALD_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("VALD_CLIENT_ID and VALD_CLIENT_SECRET Supabase Secrets are not set");
  }

  const res = await fetch("https://auth.prd.vald.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: "vald-api-external", // REQUIRED — missing = auth failure
    }),
  });

  if (!res.ok) throw new Error(`VALD auth failed (${res.status}): ${await res.text()}`);

  const data = await res.json();
  _token = data.access_token as string;
  _expiry = Date.now() + ((data.expires_in as number) - 120) * 1000;
  return _token;
}

// ── HTTP HELPER ───────────────────────────────────────────────────────────────

async function get(url: string): Promise<{ status: number; body: unknown }> {
  const token = await getToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (res.status === 204) return { status: 204, body: null };
  if (!res.ok) throw new Error(`VALD API ${res.status} at ${url}: ${await res.text()}`);

  const text = await res.text();
  if (!text.trim()) return { status: res.status, body: null };
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    throw new Error(`VALD API returned non-JSON at ${url}: ${text.slice(0, 200)}`);
  }
}

// ── METRIC EXTRACTION ─────────────────────────────────────────────────────────
// definition.result is the metric string ID; limb: Both | Left | Right | Trial | Asym

interface ValdResultDef {
  result?: string;
  name?: string;
  unit?: string;
  resultUnitScaleFactor?: number;
}

interface ValdResult {
  resultId?: number;
  value: number;
  limb?: string;
  repeat?: number;
  result?: string;
  resultUnitScaleFactor?: number;
  definition?: ValdResultDef;
}

function resultId(r: ValdResult): string {
  return r.definition?.result ?? r.result ?? String(r.resultId ?? "UNKNOWN");
}

function scale(r: ValdResult): number {
  return r.definition?.resultUnitScaleFactor ?? r.resultUnitScaleFactor ?? 1;
}

/**
 * Look up a metric by string ID.
 * ForceDecks reports bilateral values with limb "Trial" (and sometimes "Both"),
 * so bilateral lookups accept either.
 */
function metric(results: ValdResult[], id: string, limb = "Both"): number | null {
  const limbs = limb === "Both" ? ["Both", "Trial"] : [limb];
  for (const l of limbs) {
    const r = results.find((m) => resultId(m) === id && (m.limb ?? "Both") === l);
    if (r) return Math.round(r.value * scale(r) * 100) / 100;
  }
  return null;
}

/** First non-null metric across a list of candidate IDs. */
function firstMetric(results: ValdResult[], ids: string[], limb = "Both"): number | null {
  for (const id of ids) {
    const v = metric(results, id, limb);
    if (v != null) return v;
  }
  return null;
}

function allMetrics(results: ValdResult[]): Record<string, number> {
  const map: Record<string, number> = {};
  results.forEach((r) => {
    map[`${resultId(r)}_${r.limb ?? "Both"}`] = Math.round(r.value * scale(r) * 100) / 100;
  });
  return map;
}

// Metric string IDs verified against live /trials responses.
const ID_HEIGHT = ["JUMP_HEIGHT_IMP_MOM", "JUMP_HEIGHT", "IMPULSE_JUMP_HEIGHT"];
const ID_RSI_MOD = ["RSI_MODIFIED", "RSI_MODIFIED_IMP_MOM"];
const ID_RSI = ["RSI", "REACTIVE_STRENGTH_INDEX", "REACTIVE_STR_IDX"];
const ID_PEAK_POWER = ["PEAK_TAKEOFF_POWER", "PEAK_PROPULSIVE_POWER", "PEAK_PROPULSIVE_PWR"];
const ID_CONTACT = ["GROUND_CONTACT_TIME", "CONTRACTION_TIME"];

/** Flat metric fields consumed by ValdReportHub / valdToCCAthletics. */
function flatMetrics(results: ValdResult[]) {
  return {
    cmjH: firstMetric(results, ID_HEIGHT, "Both"),
    cmjHL: firstMetric(results, ID_HEIGHT, "Left"),
    cmjHR: firstMetric(results, ID_HEIGHT, "Right"),
    cmjRSI: firstMetric(results, ID_RSI_MOD, "Both"),
    cmjPP: firstMetric(results, ID_PEAK_POWER, "Both"),
    cmjAsym:
      firstMetric(results, ID_HEIGHT, "Asym") ??
      metric(results, "PEAK_TAKEOFF_FORCE", "Asym") ??
      metric(results, "ASYM_INDEX", "Both"),
    djH: firstMetric(results, ID_HEIGHT, "Both"),
    djRSI: firstMetric(results, ID_RSI, "Both") ?? firstMetric(results, ID_RSI_MOD, "Both"),
    djCT: firstMetric(results, ID_CONTACT, "Both"),
    pjH: firstMetric(results, ID_HEIGHT, "Both"),
    pjRSI: firstMetric(results, ID_RSI_MOD, "Both") ?? firstMetric(results, ID_RSI, "Both"),
  };
}


// ── HANDLERS ──────────────────────────────────────────────────────────────────

async function handleAthletes(tenantId: string) {
  const { body } = await get(`${profilesBase()}/profiles?${new URLSearchParams({ tenantId })}`);
  const list = (Array.isArray(body)
    ? body
    : ((body as Record<string, unknown>)?.profiles ??
       (body as Record<string, unknown>)?.data ??
       [])) as Record<string, unknown>[];

  const athletes = list
    .map((p) => ({
      id: p.profileId ?? p.id ?? "",
      number: p.externalId ?? p.syncId ?? "",
      name: `${p.givenName ?? ""} ${p.familyName ?? ""}`.trim(),
      givenName: p.givenName ?? "",
      familyName: p.familyName ?? "",
      dob: p.dateOfBirth ?? "",
      sex: p.sex ?? "",
      teams: ((p.teams as { name: string }[]) ?? []).map((t) => t.name).join(", "),
    }))
    .sort((a, b) => (a.name as string).localeCompare(b.name as string));

  return { athletes, count: athletes.length };
}

function tenYearsAgoIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  return d.toISOString();
}

async function handleTests(tenantId: string, athleteId: string, modifiedFromUtc?: string) {
  const from =
    modifiedFromUtc && !Number.isNaN(Date.parse(modifiedFromUtc))
      ? new Date(modifiedFromUtc).toISOString()
      : tenYearsAgoIso();

  const base = forcedecksBase();

  // Preferred (documented) endpoint, with fallback to the legacy team-scoped route.
  const candidates = [
    `${base}/tests?${new URLSearchParams({ tenantId, modifiedFromUtc: from, profileId: athleteId })}`,
    `${base}/v2019q3/teams/${tenantId}/tests?${new URLSearchParams({ athleteId, modifiedFrom: from })}`,
  ];

  let body: unknown = null;
  let status = 204;
  let lastErr: unknown = null;

  for (const url of candidates) {
    try {
      const res = await get(url);
      status = res.status;
      body = res.body;
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      console.warn("[vald-bridge] tests endpoint failed, trying fallback:", String(err));
    }
  }
  if (lastErr) throw lastErr;

  if (status === 204 || body == null) return { tests: [], count: 0 };

  const raw = body as Record<string, unknown>;
  const list = (Array.isArray(body) ? body : (raw.tests ?? raw.data ?? [])) as Record<string, unknown>[];

  const tests = list
    .map((t) => {
      const results = (t.results ?? []) as ValdResult[];
      const recorded = (t.recordedDateUtc ?? t.recordedUTC ?? "") as string;
      return {
        id: t.testId ?? t.id,
        date: typeof recorded === "string" ? recorded.slice(0, 10) : "",
        modifiedDate: t.modifiedDateUtc ?? t.modifiedUTC ?? null,
        type: t.testType ?? t.type ?? "Unknown",
        profileId: t.profileId ?? athleteId,
        tenantId: t.tenantId ?? tenantId,
        recordingId: t.recordingId ?? null,
        notes: t.notes ?? "",
        ...flatMetrics(results),
      };
    })
    .sort((a, b) => (b.date as string).localeCompare(a.date as string));

  return { tests, count: tests.length };
}

async function handleDetail(tenantId: string, testId: string) {
  const { status, body } = await get(
    `${forcedecksBase()}/v2019q3/teams/${tenantId}/tests/${testId}/trials`,
  );

  if (status === 204 || body == null) return { trialCount: 0, raw: {} };

  const trials = (Array.isArray(body)
    ? body
    : ((body as Record<string, unknown>).trials ?? [body])) as Record<string, unknown>[];

  const best = (trials[0] ?? {}) as Record<string, unknown>;
  const results = (best.results ?? []) as ValdResult[];

  return {
    trialCount: trials.length,
    limb: best.limb ?? null,
    raw: allMetrics(results),
    ...flatMetrics(results),

    // Extended CMJ metrics
    avgBrakingForce: metric(results, "AVG_BRAKING_FORCE", "Both"),
    avgPropulsiveForce: metric(results, "AVG_PROPULSIVE_FORCE", "Both"),
    avgBrakingPower: metric(results, "AVG_BRAKING_POWER", "Both"),
    avgPropulsivePower: metric(results, "AVG_PROPULSIVE_POWER", "Both"),
    peakPropForce: metric(results, "PEAK_PROPULSIVE_FORCE", "Both"),
    netImpulse: metric(results, "NET_IMPULSE", "Both"),
    brakingDuration: metric(results, "BRAKING_DURATION", "Both"),
    takeoffVelocity: metric(results, "TAKEOFF_VELOCITY", "Both"),

    // Drop jump limbs
    djL: metric(results, "PEAK_LANDING_FORCE", "Left") ?? metric(results, "JUMP_HEIGHT", "Left"),
    djR: metric(results, "PEAK_LANDING_FORCE", "Right") ?? metric(results, "JUMP_HEIGHT", "Right"),
    djAsym: metric(results, "JUMP_HEIGHT", "Asym") ?? metric(results, "ASYM_INDEX", "Both"),

    // Pogo
    pjCT: metric(results, "GROUND_CONTACT_TIME", "Both") ?? metric(results, "CONTRACTION_TIME", "Both"),

    // Isometric
    solL: metric(results, "PEAK_FORCE", "Left"),
    solR: metric(results, "PEAK_FORCE", "Right"),
    gasL: metric(results, "FORCE_AT_250MS", "Left") ?? metric(results, "FORCE_250MS", "Left"),
    gasR: metric(results, "FORCE_AT_250MS", "Right") ?? metric(results, "FORCE_250MS", "Right"),
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "athletes";
    const tenantId = Deno.env.get("VALD_TENANT_ID") ?? "";
    if (!tenantId) throw new Error("VALD_TENANT_ID Supabase Secret is not set");

    let payload: unknown;

    if (action === "athletes") {
      payload = await handleAthletes(tenantId);
    } else if (action === "tests") {
      const athleteId = url.searchParams.get("athleteId") ?? "";
      if (!athleteId) throw new Error("athleteId is required");
      const from =
        url.searchParams.get("modifiedFromUtc") ??
        url.searchParams.get("modifiedFrom") ??
        undefined;
      payload = await handleTests(tenantId, athleteId, from);
    } else if (action === "detail") {
      const testId = url.searchParams.get("testId") ?? "";
      if (!testId) throw new Error("testId is required");
      payload = await handleDetail(tenantId, testId);
    } else {
      throw new Error(`Unknown action "${action}". Valid: athletes | tests | detail`);
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[vald-bridge]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
