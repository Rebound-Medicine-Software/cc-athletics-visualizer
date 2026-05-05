import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_HOSTS = new Set(["docs.google.com"]);

type ErrorCode =
  | "invalid_url"
  | "unsupported_host"
  | "google_fetch_failed"
  | "not_published_or_private"
  | "file_too_large"
  | "empty_csv"
  | "timeout"
  | "internal_error";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_url: "The URL is missing or malformed. Please paste a valid Google Sheets link.",
  unsupported_host: "Only links from docs.google.com are allowed.",
  google_fetch_failed: "Google Sheets refused the request. Check the link and that the sheet is shared.",
  not_published_or_private:
    "This sheet is not publicly published as CSV. In Google Sheets, go to File → Share → Publish to web → CSV.",
  file_too_large: "The sheet is too large to import (limit 10MB).",
  empty_csv: "The published sheet appears to be empty.",
  timeout: "Google Sheets took too long to respond. Try again in a moment.",
  internal_error: "Something went wrong fetching the sheet.",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: ErrorCode, diagnostics: Record<string, unknown> = {}, status = 200) {
  // Always return 200 so client SDK doesn't swallow the body as a non-2xx error.
  return ok(
    {
      error: code,
      message: ERROR_MESSAGES[code],
      diagnostics,
    },
    status,
  );
}

function normalizeTarget(parsed: URL, gidOverride?: string): string {
  const path = parsed.pathname;

  if (path.includes("/export") || path.includes("/gviz/")) {
    if (gidOverride) {
      const u = new URL(parsed.toString());
      u.searchParams.set("gid", gidOverride);
      return u.toString();
    }
    return parsed.toString();
  }

  const pubMatch = path.match(/\/spreadsheets\/d\/e\/([^/]+)\/(pub|pubhtml)/);
  if (pubMatch) {
    const gid =
      gidOverride ??
      parsed.searchParams.get("gid") ??
      parsed.hash?.match(/gid=(\d+)/)?.[1];
    const u = new URL(`https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub`);
    u.searchParams.set("output", "csv");
    if (gid) u.searchParams.set("gid", gid);
    return u.toString();
  }

  const m = path.match(/\/spreadsheets\/d\/([^/]+)/);
  if (m) {
    const gid =
      gidOverride ??
      parsed.searchParams.get("gid") ??
      parsed.hash?.match(/gid=(\d+)/)?.[1] ??
      "0";
    return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
  }

  return parsed.toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let inputUrl = "";
  let gidOverride: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    inputUrl = typeof body?.url === "string" ? body.url : "";
    if (typeof body?.gid === "string" && /^\d+$/.test(body.gid)) gidOverride = body.gid;
    else if (typeof body?.gid === "number") gidOverride = String(body.gid);

    if (!inputUrl || inputUrl.length > 1000) {
      return fail("invalid_url", { reason: "missing_or_too_long" });
    }

    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      return fail("invalid_url", { reason: "malformed" });
    }

    if (parsed.protocol !== "https:") {
      return fail("invalid_url", { reason: "non_https", protocol: parsed.protocol });
    }
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return fail("unsupported_host", { hostname: parsed.hostname });
    }

    const target = normalizeTarget(parsed, gidOverride);

    // Timeout guard
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 20_000);

    let res: Response;
    try {
      res = await fetch(target, { redirect: "follow", signal: ctrl.signal });
    } catch (e) {
      clearTimeout(tid);
      const msg = (e as Error)?.name === "AbortError" ? "timeout" : "google_fetch_failed";
      console.log(`[fetch-google-sheet-csv] fetch_error target=${target} err=${(e as Error).message}`);
      return fail(msg as ErrorCode, { source_url_used: target });
    }
    clearTimeout(tid);

    const status_code = res.status;
    const content_type = res.headers.get("content-type") ?? "";
    const byte_length_header = res.headers.get("content-length");

    console.log(
      `[fetch-google-sheet-csv] target=${target} status=${status_code} ct=${content_type} cl=${byte_length_header ?? "?"}`,
    );

    if (!res.ok) {
      // 401/403/404 from /export typically means private or unpublished
      const code: ErrorCode =
        status_code === 401 || status_code === 403 || status_code === 404
          ? "not_published_or_private"
          : "google_fetch_failed";
      return fail(code, { source_url_used: target, status_code, content_type });
    }

    // Google returns text/html (a sign-in page) when the sheet is private.
    if (content_type.includes("text/html")) {
      return fail("not_published_or_private", {
        source_url_used: target,
        status_code,
        content_type,
        hint: "Received HTML instead of CSV — sheet likely requires sign-in.",
      });
    }

    const text = await res.text();
    const byte_length = new TextEncoder().encode(text).length;

    if (byte_length > 10_000_000) {
      return fail("file_too_large", { source_url_used: target, byte_length });
    }
    if (!text.trim()) {
      return fail("empty_csv", { source_url_used: target, byte_length });
    }

    const estimated_line_count =
      (text.match(/\n/g)?.length ?? 0) + (text.endsWith("\n") ? 0 : 1);

    const preview_head = text.slice(0, 500);
    const preview_tail = text.length > 500 ? text.slice(-500) : "";

    return ok({
      csv: text,
      byte_length,
      estimated_line_count,
      source_url_used: target,
      status_code,
      content_type,
      preview_head,
      preview_tail,
    });
  } catch (err) {
    console.log(`[fetch-google-sheet-csv] internal_error url=${inputUrl} err=${(err as Error).message}`);
    return fail("internal_error", { message: (err as Error).message });
  }
});
