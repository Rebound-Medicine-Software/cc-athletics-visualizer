import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allow only Google docs published CSV URLs to prevent SSRF.
const ALLOWED_HOSTS = new Set(["docs.google.com"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || url.length > 1000) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Malformed URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
      return new Response(
        JSON.stringify({
          error:
            "Only published Google Sheets CSV links from docs.google.com are allowed.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Try to coerce to CSV export form
    let target = parsed.toString();
    if (
      parsed.pathname.includes("/spreadsheets/d/") &&
      !parsed.searchParams.get("output") &&
      !parsed.pathname.endsWith("/pub")
    ) {
      // /spreadsheets/d/ID/edit?... → export?format=csv
      const m = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
      if (m) {
        const gid = parsed.hash?.match(/gid=(\d+)/)?.[1] ?? "0";
        target = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
      }
    }

    const res = await fetch(target, { redirect: "follow" });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Sheet fetch failed (${res.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const text = await res.text();
    if (text.length > 5_000_000) {
      return new Response(JSON.stringify({ error: "Sheet too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ csv: text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
