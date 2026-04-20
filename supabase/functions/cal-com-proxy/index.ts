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
const CAL_API_VERSION_SLOTS = "2024-09-04";

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

      const res = await fetch(calUrl, { headers: makeHeaders(CAL_API_VERSION_BOOKINGS) });
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
      const res = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}`, { headers: makeHeaders(CAL_API_VERSION_BOOKINGS) });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST create booking
    if (action === "create-booking" && req.method === "POST") {
      const body = await req.json();
      // Cal.com v2 supports `noEmail` in the body to suppress attendee emails
      const res = await fetch(`${CAL_API_BASE}/bookings`, {
        method: "POST",
        headers: makeHeaders(CAL_API_VERSION_BOOKINGS),
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
      if (!body?.start) {
        return new Response(JSON.stringify({ error: "start required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const res = await fetch(`${CAL_API_BASE}/bookings/${bookingUid}/reschedule`, {
        method: "POST",
        headers: makeHeaders(CAL_API_VERSION_BOOKINGS),
        body: JSON.stringify({
          start: body.start,
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
        headers: makeHeaders(CAL_API_VERSION_BOOKINGS),
        body: JSON.stringify({
          cancellationReason: body.reason || "Cancelled via dashboard",
          ...(body.noEmail === true ? { noEmail: true } : {}),
        }),
      });
      const data = await res.json();
      // Idempotent: treat "already cancelled" as success so retries / resize flows don't break
      const errMsg = JSON.stringify(data?.error || data || "").toLowerCase();
      if (!res.ok && errMsg.includes("cancelled already")) {
        console.warn(`Cal.com cancel: booking ${bookingUid} already cancelled, returning success`);
        return new Response(JSON.stringify({ status: "success", data: { uid: bookingUid, alreadyCancelled: true } }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET event types
    if (action === "list-event-types" && req.method === "GET") {
      const res = await fetch(`${CAL_API_BASE}/event-types`, { headers: makeHeaders(CAL_API_VERSION_EVENT_TYPES) });
      const data = await res.json();
      // Gracefully handle 404 (known issue for personal Cal.com accounts)
      if (res.status === 404) {
        console.warn("Cal.com event-types returned 404 - this may be a personal account limitation");
        return new Response(JSON.stringify({ status: "success", data: { eventTypeGroups: [] } }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET available slots for an event type
    if (action === "list-slots" && req.method === "GET") {
      const eventTypeId = url.searchParams.get("eventTypeId");
      const start = url.searchParams.get("start"); // ISO date e.g. 2026-04-16
      const end = url.searchParams.get("end");
      const duration = url.searchParams.get("duration"); // optional minutes
      if (!eventTypeId || !start || !end) {
        return new Response(JSON.stringify({ error: "eventTypeId, start, end required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let slotsUrl = `${CAL_API_BASE}/slots?eventTypeId=${eventTypeId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
      if (duration) slotsUrl += `&duration=${encodeURIComponent(duration)}`;
      const res = await fetch(slotsUrl, { headers: makeHeaders(CAL_API_VERSION_SLOTS) });
      const data = await res.json();
      // Normalize 4xx to 200 with empty slots so the UI doesn't crash
      if (!res.ok) {
        console.warn("Cal.com slots returned", res.status, data);
        return new Response(JSON.stringify({ status: "success", data: {} }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET schedules
    if (action === "list-schedules" && req.method === "GET") {
      const res = await fetch(`${CAL_API_BASE}/schedules`, { headers: makeHeaders(CAL_API_VERSION_SCHEDULES) });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", validActions: ["list-bookings", "get-booking", "create-booking", "reschedule-booking", "cancel-booking", "list-event-types", "list-schedules", "list-slots"] }),
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
