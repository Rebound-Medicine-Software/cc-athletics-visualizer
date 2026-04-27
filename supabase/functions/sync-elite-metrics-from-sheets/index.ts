import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleSpreadsheet } from "npm:google-spreadsheet";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials unavailable in environment.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const GOOGLE_CRED = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!GOOGLE_CRED) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set.");
    }

    let googleCred;
    try {
      googleCred = JSON.parse(GOOGLE_CRED);
    } catch (e) {
      try {
        googleCred = JSON.parse(
          new TextDecoder().decode(base64Decode(GOOGLE_CRED))
        );
      } catch {
        throw new Error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON secret. Is it valid JSON?");
      }
    }

    // Use actual sheet ID from user
    const SHEET_ID = "1h6EodU1uaNMBSCno-wLcCISprfGBECu-ybfpTmvCXGo";
    const WORKSHEET_TITLE = "Comparison Table"; // Update if actual tab name is different

    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(googleCred);
    await doc.loadInfo();

    const sheet = Object.values(doc.sheetsByIndex).find(ws => ws.title === WORKSHEET_TITLE);
    if (!sheet) {
      throw new Error(`Worksheet/tab "${WORKSHEET_TITLE}" not found.`);
    }

    const rows = await sheet.getRows();
    if (!rows.length) {
      throw new Error("No data rows found in the Comparison Table worksheet.");
    }

    // Utilities to pull strings/numbers
    const getString = (row, key) => row[key]?.toString().trim() || null;
    const getNumber = (row, key) => {
      const val = row[key];
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        // Remove commas, units, etc
        const parsed = parseFloat(val.replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    // Build wide-format rows for canonical public.elite_athlete_data table.
    // Unique key: (team_name, athlete_name, sport, age_group, weight_category)
    const rowsToUpsert: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const team_name = getString(row, "Team Name") ?? getString(row, "Team") ?? "";
      const athlete_name = getString(row, "Athlete Name") ?? getString(row, "Athlete") ?? "";
      if (!team_name || !athlete_name) continue;

      // age_group is integer in canonical table — extract first integer
      const ageRaw = getString(row, "Age Group");
      const ageMatch = ageRaw ? ageRaw.match(/\d+/) : null;
      const age_group = ageMatch ? parseInt(ageMatch[0], 10) : null;

      // weight_category in canonical table is TEXT — preserve original string
      const weight_category = getString(row, "Weight Category (kg)");

      rowsToUpsert.push({
        team_name,
        athlete_name,
        sex: getString(row, "Sex"),
        sport: getString(row, "Sport"),
        age_group,
        weight_category,
        cmj_jump_height_cm: getNumber(row, "CMJ Jump Height (cm)"),
        cmj_peak_power_w: getNumber(row, "CMJ Peak Power (W)"),
        cmj_relative_peak_power_w_per_kg: getNumber(row, "CMJ Relative Peak Power (W/kg)"),
        cmj_reactive_strength_index: getString(row, "CMJ Reactive Strength Index"),
        imtp_peak_force_n: getNumber(row, "IMTP Peak Force (N)"),
        imtp_relative_peak_force_n_per_kg: getNumber(row, "IMTP Relative Peak Force (N/kg)"),
        test_date: row["Test Date"]
          ? (() => {
              if (row["Test Date"] instanceof Date) {
                return (row["Test Date"] as Date).toISOString().slice(0, 10);
              }
              if (typeof row["Test Date"] === "string") {
                const dt = new Date(row["Test Date"]);
                return isNaN(dt.valueOf()) ? null : dt.toISOString().slice(0, 10);
              }
              return null;
            })()
          : null,
      });
    }

    // The canonical unique constraint is an EXPRESSION index (uses COALESCE),
    // so onConflict cannot reference it directly. Use manual lookup-then-upsert.
    let insertedCount = 0;
    let updatedCount = 0;

    for (const r of rowsToUpsert) {
      // Find existing row by canonical unique tuple
      const { data: existing, error: selErr } = await supabase
        .from("elite_athlete_data")
        .select("id")
        .eq("team_name", r.team_name as string)
        .eq("athlete_name", r.athlete_name as string)
        .eq("sport", (r.sport as string) ?? "")
        .eq("age_group", (r.age_group as number) ?? 0)
        .eq("weight_category", (r.weight_category as string) ?? "")
        .maybeSingle();

      if (selErr) {
        console.error("Lookup error:", selErr.message);
        continue;
      }

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from("elite_athlete_data")
          .update(r)
          .eq("id", existing.id);
        if (updErr) {
          console.error("Update error:", updErr.message);
          continue;
        }
        updatedCount += 1;
      } else {
        const { error: insErr } = await supabase
          .from("elite_athlete_data")
          .insert(r);
        if (insErr) {
          console.error("Insert error:", insErr.message);
          continue;
        }
        insertedCount += 1;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rows_processed: rows.length,
        rows_upserted: rowsToUpsert.length,
        inserted: insertedCount,
        updated: updatedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Elite metrics sheet sync failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? `${err}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
