import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_API_VERSION_BOOKINGS = "2024-08-13";
const CAL_API_VERSION_EVENT_TYPES = "2024-06-14";
const CAL_API_VERSION_SCHEDULES = "2024-06-11";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calApiKey = Deno.env.get("CAL_COM_API_KEY");
    if (!calApiKey) {
      return new Response(
        JSON.stringify({ error: "Cal.com API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const makeHeaders = (version: string): Record<string, string> => ({
      Authorization: `Bearer ${calApiKey}`,
      "Content-Type": "application/json",
      "cal-api-version": version,
    });

    // GET bookings
    if (action === "list-bookings" && req.method === "GET") {
      const status = url.searchParams.get("status") || "upcoming";
      const afterStart = url.searchParams.get("afterStart") || "";
      const beforeEnd = url.searchParams.get("beforeEnd") || "";

      let calUrl = `${CAL_API_BASE}/bookings?status=${status}&sortStart=asc&take=100`;
      if (afterStart) calUrl += `&afterStart=${afterStart}`;
      if (beforeEnd) calUrl += `&beforeEnd=${beforeEnd}`;

      const res = await fetch(calUrl, { headers: calHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET single booking
    if (action === "get-booking" && req.method === "GET") {
      const bookingUid = url.searchParams.get("uid");
      if (!bookingUid) {
        return new Response(JSON.stringify({ error: "uid required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}`, { headers: calHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST create booking
    if (action === "create-booking" && req.method === "POST") {
      const body = await req.json();
      const res = await fetch(`${CAL_API_BASE}/bookings`, {
        method: "POST",
        headers: calHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH reschedule booking
    if (action === "reschedule-booking" && req.method === "POST") {
      const body = await req.json();
      const bookingUid = body.uid;
      if (!bookingUid) {
        return new Response(JSON.stringify({ error: "uid required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}/reschedule`, {
        method: "POST",
        headers: calHeaders,
        body: JSON.stringify({
          start: body.start,
          rescheduleReason: body.reason || "Rescheduled via dashboard",
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH cancel booking
    if (action === "cancel-booking" && req.method === "POST") {
      const body = await req.json();
      const bookingUid = body.uid;
      if (!bookingUid) {
        return new Response(JSON.stringify({ error: "uid required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}/cancel`, {
        method: "POST",
        headers: calHeaders,
        body: JSON.stringify({
          cancellationReason: body.reason || "Cancelled via dashboard",
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET event types
    if (action === "list-event-types" && req.method === "GET") {
      const res = await fetch(`${CAL_API_BASE}/event-types`, { headers: calHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET schedules
    if (action === "list-schedules" && req.method === "GET") {
      const res = await fetch(`${CAL_API_BASE}/schedules`, { headers: calHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", validActions: ["list-bookings", "get-booking", "create-booking", "reschedule-booking", "cancel-booking", "list-event-types", "list-schedules"] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Cal.com proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
