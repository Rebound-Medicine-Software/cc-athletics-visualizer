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
// VALD's token endpoint is quota limited per client. Each cold edge isolate would
// otherwise mint its own token, which quickly trips "Client quota exceeded" (429).
// So the token is cached in the database and shared by every isolate.

let _token = "";
let _expiry = 0;
let _inflight: Promise<string> | null = null;
const TOKEN_SKEW_MS = 15_000;

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CACHE_URL = `${SB_URL}/rest/v1/vald_token_cache`;
const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

function tokenExpiry(token: string, fallback: number): number {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return fallback;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : fallback;
  } catch {
    return fallback;
  }
}

async function readCachedToken(): Promise<{ token: string; expiresAt: number } | null> {
  if (!SB_URL || !SB_KEY) return null;
  try {
    const res = await fetch(`${CACHE_URL}?id=eq.default&select=access_token,expires_at`, {
      headers: sbHeaders,
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.access_token) return null;
    const token = row.access_token as string;
    const storedExpiry = Date.parse(row.expires_at);
    return { token, expiresAt: tokenExpiry(token, storedExpiry) };
  } catch {
    return null;
  }
}

async function writeCachedToken(token: string, expiresAt: number): Promise<void> {
  if (!SB_URL || !SB_KEY) return;
  try {
    await fetch(`${CACHE_URL}?on_conflict=id`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        id: "default",
        access_token: token,
        expires_at: new Date(expiresAt).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Cache write failures are non-fatal.
  }
}

async function requestToken(forceRefresh = false): Promise<string> {
  const clientId = Deno.env.get("VALD_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("VALD_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("VALD_CLIENT_ID and VALD_CLIENT_SECRET Supabase Secrets are not set");
  }

  // Another isolate may already have minted a valid token.
  const cached = await readCachedToken();
  if (!forceRefresh && cached && Date.now() < cached.expiresAt - TOKEN_SKEW_MS) {
    _token = cached.token;
    _expiry = cached.expiresAt;
    return _token;
  }

  // Give another isolate time to finish a refresh, then adopt its token rather
  // than sending simultaneous requests to VALD's quota-limited auth endpoint.
  if (!forceRefresh) {
    await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 600));
    const raced = await readCachedToken();
    if (raced && Date.now() < raced.expiresAt - TOKEN_SKEW_MS) {
      _token = raced.token;
      _expiry = raced.expiresAt;
      return _token;
    }
  }

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const refreshed = await readCachedToken();
      if (refreshed && refreshed.token !== cached?.token && Date.now() < refreshed.expiresAt - TOKEN_SKEW_MS) {
        _token = refreshed.token;
        _expiry = refreshed.expiresAt;
        return _token;
      }
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

    if (res.ok) {
      const data = await res.json();
      _token = data.access_token as string;
      const fallbackExpiry = Date.now() + (data.expires_in as number) * 1000;
      _expiry = tokenExpiry(_token, fallbackExpiry);
      await writeCachedToken(_token, _expiry);
      return _token;
    }

    lastError = `${res.status}: ${await res.text()}`;
    if (res.status !== 429) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2000 * (attempt + 1) + Math.random() * 1000;
    await new Promise((r) => setTimeout(r, delay));
  }

  // Quota exhausted — fall back to the last cached token even if it is past our
  // safety margin; VALD tokens usually remain valid a little longer.
  if (cached?.token) {
    _token = cached.token;
    _expiry = Date.now() + 60_000;
    return _token;
  }

  throw new Error(`VALD auth failed (${lastError})`);
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && _token && Date.now() < _expiry - TOKEN_SKEW_MS) return _token;
  if (forceRefresh) {
    _token = "";
    _expiry = 0;
  }
  if (!_inflight) {
    _inflight = requestToken(forceRefresh).finally(() => {
      _inflight = null;
    });
  }
  return await _inflight;
}


// ── HTTP HELPER ───────────────────────────────────────────────────────────────

async function get(url: string): Promise<{ status: number; body: unknown }> {
  let token = await getToken();
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  // A token can be revoked before its advertised expiry. Invalidate it and
  // perform exactly one forced refresh rather than failing repeatedly.
  if (res.status === 401) {
    token = await getToken(true);
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  }

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
const ID_CONTACT = [
  "GROUND_CONTACT_TIME",
  "CONTRACTION_TIME",
  "CONTACT_TIME",
  "TOUCHDOWN_TO_TAKEOFF_DURATION",
];

/** Flat metric fields consumed by ValdReportHub / valdToCCAthletics. */
function flatMetrics(results: ValdResult[]) {
  // Build raw map once — used for fallback lookups that firstMetric() misses.
  // Confirmed from live VALD API: CONTACT_TIME (DJ/SLDJ) and HOP_BEST_* (HJ/SLHJ)
  // are present in allMetrics() but not found by firstMetric() due to resultId mismatch.
  const raw = allMetrics(results);
  const r = (k: string): number | null => (raw[k] != null ? raw[k] : null);

  const stdCT = firstMetric(results, ID_CONTACT, "Both");

  // HJ / SLHJ: all metrics use HOP_BEST_* prefix (confirmed from live /trials response)
  const hopH   = r("HOP_BEST_JUMP_HEIGHT_Trial");
  const hopRSI = r("HOP_BEST_RSI_Trial");
  const hopCT  = r("HOP_BEST_CONTACT_TIME_Trial");

  return {
    cmjH:    firstMetric(results, ID_HEIGHT, "Both"),
    cmjHL:   firstMetric(results, ID_HEIGHT, "Left"),
    cmjHR:   firstMetric(results, ID_HEIGHT, "Right"),
    cmjRSI:  (() => { const v = firstMetric(results, ID_RSI_MOD, "Both"); return v != null ? Math.round(v / 100 * 10000) / 10000 : null; })(),
    cmjPP:   firstMetric(results, ID_PEAK_POWER, "Both"),
    cmjAsym:
      firstMetric(results, ID_HEIGHT, "Asym") ??
      metric(results, "PEAK_TAKEOFF_FORCE", "Asym") ??
      metric(results, "ASYM_INDEX", "Both"),
    djH:   firstMetric(results, ID_HEIGHT, "Both"),
    djRSI: firstMetric(results, ID_RSI, "Both") ?? firstMetric(results, ID_RSI_MOD, "Both"),
    // Raw map fallback: CONTACT_TIME_Trial confirmed = 0.23s (DJ) / 0.34s (SLDJ) in live data
    djCT:  stdCT ?? r("CONTACT_TIME_Trial"),
    // Raw map fallback: HOP_BEST_* confirmed in live HJ/SLHJ /trials response
    pjH:   firstMetric(results, ID_HEIGHT, "Both") ?? hopH,
    // pjRSI: for hop tests this comes from HOP_BEST_RSI which is ALREADY in m/s
    // For CMJ-family, RSI_MODIFIED is in cm/s and needs /100
    // We detect which by checking if hopRSI exists (hop tests) vs standard RSI (CMJ)
    pjRSI: (function() {
      var hopVal = hopRSI; // HOP_BEST_RSI_Trial — already m/s
      if (hopVal != null) return Math.round(hopVal * 1000) / 1000;
      var stdVal = firstMetric(results, ID_RSI_MOD, "Both") || firstMetric(results, ID_RSI, "Both");
      // RSI_MODIFIED is cm/s for CMJ family -> divide by 100 to get m/s
      return stdVal != null ? Math.round(stdVal / 100 * 10000) / 10000 : null;
    }()),
    pjCT:  stdCT ?? hopCT,
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
      sex: (p.sex as string | undefined) ?? (p.gender as string | undefined) ?? "",
      teams: (() => {
        const teamArr = (p.teams as { name: string }[] | undefined) ??
                        (p.groups as { name: string }[] | undefined) ?? [];
        return teamArr.map((t) => t.name).join(", ");
      })(),
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
        id: (t.testId ?? t.id) as string,
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

  // /tests is metadata-only. Hydrate metric values from /trials so the report
  // hub and CC Athletics charts receive populated fields.
  await hydrateTestMetrics(tenantId, tests);

  return { tests, count: tests.length };
}

type TestRow = { id: string; cmjH: number | null } & Record<string, unknown>;

const MAX_HYDRATE = 40;
const HYDRATE_CONCURRENCY = 6;

async function hydrateTestMetrics(tenantId: string, tests: TestRow[]) {
  const pending = tests.filter((t) => t.id && t.cmjH == null).slice(0, MAX_HYDRATE);

  for (let i = 0; i < pending.length; i += HYDRATE_CONCURRENCY) {
    const batch = pending.slice(i, i + HYDRATE_CONCURRENCY);
    await Promise.all(
      batch.map(async (t) => {
        try {
          const results = await fetchTrialResults(tenantId, t.id);
          Object.assign(t, flatMetrics(results));
        } catch (err) {
          console.warn(`[vald-bridge] trial hydration failed for ${t.id}:`, String(err));
        }
      }),
    );
  }
}

async function fetchTrialResults(tenantId: string, testId: string): Promise<ValdResult[]> {
  const { status, body } = await get(
    `${forcedecksBase()}/v2019q3/teams/${tenantId}/tests/${testId}/trials`,
  );
  if (status === 204 || body == null) return [];
  const trials = (Array.isArray(body)
    ? body
    : ((body as Record<string, unknown>).trials ?? [body])) as Record<string, unknown>[];
  return ((trials[0] ?? {}).results ?? []) as ValdResult[];
}

async function handleDetail(tenantId: string, testId: string) {
  const { status, body } = await get(
    `${forcedecksBase()}/v2019q3/teams/${tenantId}/tests/${testId}/trials`,
  );

  if (status === 204 || body == null) return { trialCount: 0, raw: {} };

  const trials = (Array.isArray(body)
    ? body
    : ((body as Record<string, unknown>).trials ?? [body])) as Record<string, unknown>[];

  // Detect unilateral test by trial.limb values
  const trialLimbs = trials.map(t => String((t as Record<string,unknown>).limb ?? "Both"));
  const isUnilateral = trialLimbs.some(l => l === "Left" || l === "Right") && !trialLimbs.includes("Both");
  const getH = (t: Record<string,unknown>): number => {
    const r = ((t.results ?? []) as ValdResult[]);
    return firstMetric(r, ID_HEIGHT, "Both") ?? 0;
  };
  const primaryTrial = isUnilateral
    ? trials.reduce((a, b) => getH(b as Record<string,unknown>) > getH(a as Record<string,unknown>) ? b : a, trials[0]) as Record<string,unknown>
    : (trials[0] ?? {}) as Record<string, unknown>;

    const results = (primaryTrial.results ?? []) as ValdResult[];
  const allR    = allMetrics(results); // shared raw map — reused for limb fallbacks

  return {
    trialCount: trials.length,
    limb: primaryTrial.limb ?? null,
    raw: allR,
    ...flatMetrics(results),

    // Extended CMJ metrics (IDs verified against live /trials payloads)
    avgBrakingForce: firstMetric(results, ["MEAN_ECCENTRIC_BRAKING_FORCE", "AVG_BRAKING_FORCE"]),
    avgPropulsiveForce: firstMetric(results, ["MEAN_TAKEOFF_FORCE", "AVG_PROPULSIVE_FORCE"]),
    avgBrakingPower: firstMetric(results, ["MEAN_ECCENTRIC_POWER", "AVG_BRAKING_POWER"]),
    avgPropulsivePower: firstMetric(results, ["MEAN_CONCENTRIC_POWER", "AVG_PROPULSIVE_POWER"]),
    peakPropForce: firstMetric(results, ["PEAK_TAKEOFF_FORCE", "PEAK_CONCENTRIC_FORCE", "PEAK_PROPULSIVE_FORCE"]),
    netImpulse: firstMetric(results, ["POSITIVE_TAKEOFF_IMPULSE", "CONCENTRIC_IMPULSE", "NET_IMPULSE"]),
    brakingDuration: firstMetric(results, ["BRAKING_PHASE_DURATION", "BRAKING_DURATION"]),
    takeoffVelocity: firstMetric(results, ["TAKEOFF_VELOCITY", "PEAK_TAKEOFF_VELOCITY"]),
    flightTime: metric(results, "FLIGHT_TIME", "Both"),
    bodyWeight: metric(results, "BODY_WEIGHT", "Both"),

    // Per-limb: unilateral tests have trial.limb=Left/Right; get best per limb
    djL: (function() {
      var lt = trials.filter(function(t) { return t.limb === "Left"; });
      if (lt.length > 0) {
        var leftBest = lt.reduce(function(a,b) { return getH(b) > getH(a) ? b : a; });
        var lr = leftBest.results || [];
        return firstMetric(lr, ID_HEIGHT, "Both");
      }
      return metric(results, "PEAK_LANDING_FORCE", "Left") || firstMetric(results, ID_HEIGHT, "Left") || allR["HOP_BEST_AVERAGE_FORCE_Left"] || null;
    }()),
    djR: (function() {
      var rt = trials.filter(function(t) { return t.limb === "Right"; });
      if (rt.length > 0) {
        var rightBest = rt.reduce(function(a,b) { return getH(b) > getH(a) ? b : a; });
        var rr = rightBest.results || [];
        return firstMetric(rr, ID_HEIGHT, "Both");
      }
      return metric(results, "PEAK_LANDING_FORCE", "Right") || firstMetric(results, ID_HEIGHT, "Right") || allR["HOP_BEST_AVERAGE_FORCE_Right"] || null;
    }()),
    djAsym: allR["HOP_BEST_AVERAGE_FORCE_Asym"] || firstMetric(results, ID_HEIGHT, "Asym") || metric(results, "PEAK_LANDING_FORCE", "Asym") || null,
    pjCT: firstMetric(results, ID_CONTACT, "Both") ?? allR["HOP_BEST_CONTACT_TIME_Trial"] ?? null,

    // Isometric
    solL: firstMetric(results, ["PEAK_FORCE", "PEAK_VERTICAL_FORCE"], "Left"),
    solR: firstMetric(results, ["PEAK_FORCE", "PEAK_VERTICAL_FORCE"], "Right"),
    gasL: firstMetric(results, ["FORCE_AT_250MS", "FORCE_250MS"], "Left"),
    gasR: firstMetric(results, ["FORCE_AT_250MS", "FORCE_250MS"], "Right"),

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
    } else if (action === "details") {
      // Batched detail — one request (and one auth token) for many tests,
      // which avoids hammering the VALD auth quota from the browser.
      const ids = (url.searchParams.get("testIds") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30);
      if (!ids.length) throw new Error("testIds is required");

      const details: Record<string, unknown>[] = [];
      for (const id of ids) {
        try {
          details.push({ id, ...(await handleDetail(tenantId, id)) });
        } catch (_e) {
          details.push({ id, trialCount: 0, raw: {} });
        }
      }
      payload = { details, count: details.length };
    } else {
      throw new Error(`Unknown action "${action}". Valid: athletes | tests | detail | details`);
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[vald-bridge]", msg);
    const quotaLimited = msg.includes("VALD auth failed (429:");
    return new Response(JSON.stringify({
      error: quotaLimited
        ? "VALD is temporarily rate-limiting authentication. Please wait before retrying."
        : msg,
      code: quotaLimited ? "VALD_AUTH_RATE_LIMITED" : "VALD_BRIDGE_ERROR",
    }), {
      status: quotaLimited ? 503 : 500,
      headers: {
        ...CORS,
        "Content-Type": "application/json",
        ...(quotaLimited ? { "Retry-After": "60" } : {}),
      },
    });
  }
});
